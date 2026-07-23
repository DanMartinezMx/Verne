import { joinPath, type VerneFs } from "./fs.js";
import { CONTENT_DIR, type Project } from "./project.js";

/**
 * Papelera VPF: carpeta visible `papelera/` en la raíz del proyecto.
 * Borrar en Verne nunca destruye: mueve. El usuario puede ver y rescatar
 * sus archivos incluso desde el explorador, sin Verne.
 */
export const TRASH_DIR = "papelera";

const SEPARATOR = "__";

export interface TrashEntry {
  path: string;
  /** Nombre original del documento (sin timestamp ni extensión). */
  name: string;
  /** Fecha de borrado (ISO) reconstruida del nombre, si existe. */
  deletedAt: string | null;
}

export async function trashDocument(
  fs: VerneFs,
  project: Project,
  docPath: string,
): Promise<void> {
  const trashDir = joinPath(project.dir, TRASH_DIR);
  await fs.mkdir(trashDir);
  const fileName = docPath.split("/").pop() ?? "documento.md";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await fs.rename(docPath, joinPath(trashDir, `${stamp}${SEPARATOR}${fileName}`));
}

export async function listTrash(fs: VerneFs, project: Project): Promise<TrashEntry[]> {
  const trashDir = joinPath(project.dir, TRASH_DIR);
  if (!(await fs.exists(trashDir))) return [];
  const entries = (await fs.readDir(trashDir)).filter(
    (e) => !e.isDirectory && e.name.toLowerCase().endsWith(".md"),
  );
  return entries
    .map((e) => {
      const sep = e.name.indexOf(SEPARATOR);
      const original = sep > 0 ? e.name.slice(sep + SEPARATOR.length) : e.name;
      return {
        path: joinPath(trashDir, e.name),
        name: original.replace(/\.md$/i, ""),
        deletedAt: sep > 0 ? isoFromStamp(e.name.slice(0, sep)) : null,
      };
    })
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
}

/** Devuelve la ruta restaurada dentro de contenido/ (sin pisar existentes). */
export async function restoreDocument(
  fs: VerneFs,
  project: Project,
  trashPath: string,
): Promise<string> {
  const fileName = trashPath.split("/").pop() ?? "documento.md";
  const sep = fileName.indexOf(SEPARATOR);
  const original = sep > 0 ? fileName.slice(sep + SEPARATOR.length) : fileName;
  const base = original.replace(/\.md$/i, "");

  let target = joinPath(project.dir, CONTENT_DIR, `${base}.md`);
  for (let n = 2; await fs.exists(target); n++) {
    target = joinPath(project.dir, CONTENT_DIR, `${base}-${n}.md`);
  }
  await fs.rename(trashPath, target);
  return target;
}

function isoFromStamp(stamp: string): string | null {
  // 2026-07-22T10-30-05-123Z → 2026-07-22T10:30:05.123Z
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/.exec(stamp);
  return m ? `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z` : null;
}
