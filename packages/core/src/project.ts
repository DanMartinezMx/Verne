import { parseDocument } from "yaml";
import { VerneError } from "./errors.js";
import { joinPath, sanitizeName, type VerneFs } from "./fs.js";
import {
  parseManifest,
  serializeManifest,
  VPF_VERSION,
  type BlueprintId,
  type ProjectManifest,
} from "./manifest.js";

/** Layout VPF (docs/spec/vpf). Los nombres de carpeta son parte de la spec. */
export const MANIFEST_FILE = "verne.yaml";
export const CONTENT_DIR = "contenido";
export const RESOURCES_DIR = "recursos";
export const EXPORT_DIR = "export";
/** Estado interno SIEMPRE regenerable: borrarlo nunca pierde contenido. */
export const INTERNAL_DIR = ".verne";

export interface Project {
  dir: string;
  manifest: ProjectManifest;
}

export interface TreeNode {
  name: string;
  /** Ruta absoluta del archivo o carpeta. */
  path: string;
  kind: "folder" | "document";
  children?: TreeNode[];
}

export interface CreateProjectOptions {
  name: string;
  blueprint: BlueprintId;
  language?: string;
  /** Documento inicial (lo aporta el Blueprint; core no conoce plantillas). */
  starterDocument?: { fileName: string; contents: string };
  /** Carpetas que se crean bajo `contenido/` (andamio del espacio). */
  scaffold?: string[];
}

export async function createProject(
  fs: VerneFs,
  dir: string,
  options: CreateProjectOptions,
): Promise<Project> {
  if (await fs.exists(joinPath(dir, MANIFEST_FILE))) {
    throw new VerneError("ALREADY_A_PROJECT", `Ya existe un proyecto Verne en ${dir}`);
  }
  const manifest: ProjectManifest = {
    vpf: VPF_VERSION,
    name: options.name,
    blueprint: options.blueprint,
    language: options.language ?? "es",
    createdAt: new Date().toISOString(),
  };
  for (const sub of [CONTENT_DIR, RESOURCES_DIR, EXPORT_DIR, INTERNAL_DIR]) {
    await fs.mkdir(joinPath(dir, sub));
  }
  for (const folder of options.scaffold ?? []) {
    await fs.mkdir(joinPath(dir, CONTENT_DIR, sanitizeName(folder)));
  }
  if (options.starterDocument) {
    await fs.writeTextFile(
      joinPath(dir, CONTENT_DIR, options.starterDocument.fileName),
      options.starterDocument.contents,
    );
  }
  await fs.writeTextFile(joinPath(dir, MANIFEST_FILE), serializeManifest(manifest));
  return { dir, manifest };
}

/**
 * Adopta una carpeta con Markdown suelto (ex-Obsidian, notas dispersas) como
 * proyecto Verne: crea el `verne.yaml` y la estructura VPF, y recoge el
 * Markdown existente dentro de `contenido/` para que aparezca en la app. Es la
 * función de adopción más barata: convierte a curiosos con historial en
 * usuarios sin pedirles que empiecen de cero.
 */
export async function convertFolderToProject(
  fs: VerneFs,
  dir: string,
  options: Omit<CreateProjectOptions, "starterDocument">,
): Promise<Project> {
  if (await fs.exists(joinPath(dir, MANIFEST_FILE))) {
    throw new VerneError("ALREADY_A_PROJECT", `Ya existe un proyecto Verne en ${dir}`);
  }
  const contentDir = joinPath(dir, CONTENT_DIR);
  for (const sub of [CONTENT_DIR, RESOURCES_DIR, EXPORT_DIR, INTERNAL_DIR]) {
    await fs.mkdir(joinPath(dir, sub));
  }
  // Recoge en contenido/ el Markdown que ya vivía en la carpeta: archivos .md
  // de la raíz y subcarpetas que contengan Markdown. Deja intacto todo lo demás
  // (ocultos, config, imágenes sueltas) y nunca pisa lo ya adoptado.
  for (const entry of await fs.readDir(dir)) {
    if (entry.name.startsWith(".") || RESERVED_TOP_LEVEL.has(entry.name)) continue;
    const source = joinPath(dir, entry.name);
    if (entry.isDirectory) {
      if (await containsMarkdown(fs, source)) {
        await fs.rename(source, await freeTarget(fs, joinPath(contentDir, entry.name)));
      }
    } else if (entry.name.toLowerCase().endsWith(".md")) {
      await fs.rename(source, await freeTarget(fs, joinPath(contentDir, entry.name)));
    }
  }
  const manifest: ProjectManifest = {
    vpf: VPF_VERSION,
    name: options.name,
    blueprint: options.blueprint,
    language: options.language ?? "es",
    createdAt: new Date().toISOString(),
  };
  await fs.writeTextFile(joinPath(dir, MANIFEST_FILE), serializeManifest(manifest));
  return { dir, manifest };
}

/** Nombres de la raíz que nunca se adoptan (son estructura VPF, no contenido). */
const RESERVED_TOP_LEVEL = new Set([CONTENT_DIR, RESOURCES_DIR, EXPORT_DIR, "papelera", MANIFEST_FILE]);

async function containsMarkdown(fs: VerneFs, dir: string): Promise<boolean> {
  for (const entry of await fs.readDir(dir)) {
    if (entry.isDirectory) {
      if (await containsMarkdown(fs, joinPath(dir, entry.name))) return true;
    } else if (entry.name.toLowerCase().endsWith(".md")) {
      return true;
    }
  }
  return false;
}

/** Ruta libre dentro de contenido/: si ya existe, prueba `-2`, `-3`… */
async function freeTarget(fs: VerneFs, target: string): Promise<string> {
  if (!(await fs.exists(target))) return target;
  const isMd = target.toLowerCase().endsWith(".md");
  const stem = isMd ? target.slice(0, -3) : target;
  const ext = isMd ? ".md" : "";
  for (let n = 2; ; n++) {
    const candidate = `${stem}-${n}${ext}`;
    if (!(await fs.exists(candidate))) return candidate;
  }
}

export async function openProject(fs: VerneFs, dir: string): Promise<Project> {
  const manifestPath = joinPath(dir, MANIFEST_FILE);
  if (!(await fs.exists(manifestPath))) {
    throw new VerneError("NOT_A_PROJECT", `No hay un ${MANIFEST_FILE} en ${dir}`);
  }
  const manifest = parseManifest(await fs.readTextFile(manifestPath));
  // Garantía VPF: el estado interno es prescindible y se regenera al abrir.
  if (!(await fs.exists(joinPath(dir, INTERNAL_DIR)))) {
    await fs.mkdir(joinPath(dir, INTERNAL_DIR));
  }
  return { dir, manifest };
}

/** Actualiza campos del manifiesto preservando campos y comentarios ajenos. */
export async function updateProjectManifest(
  fs: VerneFs,
  project: Project,
  changes: Partial<Pick<ProjectManifest, "name" | "author" | "language">>,
): Promise<Project> {
  const path = joinPath(project.dir, MANIFEST_FILE);
  const doc = parseDocument(await fs.readTextFile(path));
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === "") doc.delete(key);
    else doc.set(key, value);
  }
  const text = doc.toString();
  await fs.writeTextFile(path, text);
  return { dir: project.dir, manifest: parseManifest(text) };
}

export async function readProjectTree(fs: VerneFs, project: Project): Promise<TreeNode[]> {
  const contentDir = joinPath(project.dir, CONTENT_DIR);
  if (!(await fs.exists(contentDir))) {
    return [];
  }
  return readTreeLevel(fs, contentDir);
}

async function readTreeLevel(fs: VerneFs, dir: string): Promise<TreeNode[]> {
  const entries = await fs.readDir(dir);
  const nodes: TreeNode[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const path = joinPath(dir, entry.name);
    if (entry.isDirectory) {
      nodes.push({ name: entry.name, path, kind: "folder", children: await readTreeLevel(fs, path) });
    } else if (entry.name.toLowerCase().endsWith(".md")) {
      nodes.push({ name: entry.name.replace(/\.md$/i, ""), path, kind: "document" });
    }
  }
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
  return nodes;
}
