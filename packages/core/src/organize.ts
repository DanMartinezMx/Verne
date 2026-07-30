import { historyDirFor } from "./document.js";
import { VerneError } from "./errors.js";
import { joinPath, sanitizeName, type VerneFs } from "./fs.js";
import { CONTENT_DIR, type Project } from "./project.js";

/**
 * Reorganización del árbol: crear carpetas, renombrar y mover documentos y
 * carpetas. Todo ocurre dentro de `contenido/` (nunca toca `.verne/`, el
 * manifiesto ni la papelera desde aquí) y todo arrastra su historial: renombrar
 * o mover algo no pierde sus versiones guardadas.
 */

function contentRoot(project: Project): string {
  return joinPath(project.dir, CONTENT_DIR);
}

/** ¿La ruta está dentro de `contenido/` (raíz incluida)? */
function isInsideContent(project: Project, path: string): boolean {
  const root = contentRoot(project);
  return path === root || path.startsWith(`${root}/`);
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function parentDir(path: string): string {
  const i = path.lastIndexOf("/");
  return i <= 0 ? path : path.slice(0, i);
}

/** Devuelve una ruta libre: si existe, prueba `-2`, `-3`… (antes del `.md`). */
async function uniquePath(fs: VerneFs, target: string): Promise<string> {
  if (!(await fs.exists(target))) return target;
  const isMd = target.toLowerCase().endsWith(".md");
  const stem = isMd ? target.slice(0, -3) : target;
  const ext = isMd ? ".md" : "";
  for (let n = 2; ; n++) {
    const candidate = `${stem}-${n}${ext}`;
    if (!(await fs.exists(candidate))) return candidate;
  }
}

/** Mueve el historial de un elemento al espejar su nueva ruta relativa. */
async function moveHistory(
  fs: VerneFs,
  project: Project,
  oldPath: string,
  newPath: string,
): Promise<void> {
  const oldHist = historyDirFor(project, oldPath);
  if (!(await fs.exists(oldHist))) return;
  const newHist = historyDirFor(project, newPath);
  await fs.mkdir(parentDir(newHist));
  await fs.rename(oldHist, newHist);
}

/**
 * Crea una carpeta dentro de `contenido/`. `parent` es la carpeta contenedora
 * (por defecto, la raíz de contenido). Devuelve la ruta creada.
 */
export async function createFolder(
  fs: VerneFs,
  project: Project,
  name: string,
  parent?: string,
): Promise<string> {
  const clean = sanitizeName(name);
  if (clean === "") throw new VerneError("INVALID_NAME", "El nombre de la carpeta está vacío.");
  const parentPath = parent ?? contentRoot(project);
  if (!isInsideContent(project, parentPath)) {
    throw new VerneError("OUTSIDE_CONTENT", "Solo se pueden crear carpetas dentro de contenido/.");
  }
  const target = await uniquePath(fs, joinPath(parentPath, clean));
  await fs.mkdir(target);
  return target;
}

/**
 * Renombra un documento o carpeta dentro de su misma carpeta. Para un documento
 * conserva la extensión `.md`. Arrastra el historial. Devuelve la nueva ruta.
 */
export async function renameEntry(
  fs: VerneFs,
  project: Project,
  path: string,
  newName: string,
): Promise<string> {
  if (!isInsideContent(project, path) || path === contentRoot(project)) {
    throw new VerneError("OUTSIDE_CONTENT", "Solo se renombra dentro de contenido/.");
  }
  const clean = sanitizeName(newName.replace(/\.md$/i, ""));
  if (clean === "") throw new VerneError("INVALID_NAME", "El nombre nuevo está vacío.");
  const isMd = path.toLowerCase().endsWith(".md");
  const target = joinPath(parentDir(path), isMd ? `${clean}.md` : clean);
  if (target === path) return path;
  const finalPath = await uniquePath(fs, target);
  await fs.rename(path, finalPath);
  await moveHistory(fs, project, path, finalPath);
  return finalPath;
}

/**
 * Mueve un documento o carpeta a otra carpeta de `contenido/`. Impide mover una
 * carpeta dentro de sí misma o de un descendiente. Arrastra el historial.
 * Devuelve la nueva ruta.
 */
export async function moveEntry(
  fs: VerneFs,
  project: Project,
  path: string,
  targetDir: string,
): Promise<string> {
  if (!isInsideContent(project, path) || path === contentRoot(project)) {
    throw new VerneError("OUTSIDE_CONTENT", "Solo se mueve contenido dentro de contenido/.");
  }
  if (!isInsideContent(project, targetDir)) {
    throw new VerneError("OUTSIDE_CONTENT", "El destino debe estar dentro de contenido/.");
  }
  // Mover una carpeta dentro de sí misma o de un hijo suyo rompería el árbol.
  if (targetDir === path || targetDir.startsWith(`${path}/`)) {
    throw new VerneError("INVALID_MOVE", "No se puede mover una carpeta dentro de sí misma.");
  }
  if (parentDir(path) === targetDir) return path; // ya está ahí
  const target = await uniquePath(fs, joinPath(targetDir, baseName(path)));
  await fs.rename(path, target);
  await moveHistory(fs, project, path, target);
  return target;
}
