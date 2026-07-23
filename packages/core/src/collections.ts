import { readDocument, writeDocument } from "./document.js";
import { getFrontmatterFields, withFrontmatterFields } from "./frontmatter.js";
import { joinPath, type VerneFs } from "./fs.js";
import type { Project } from "./project.js";

/**
 * Colecciones VPF (RFC-0001 §10.3, versión mínima de M2): fichas Markdown con
 * campos en frontmatter, dentro de `colecciones/<nombre>/`. La primitiva es
 * genérica; los Blueprints deciden qué colecciones existen y qué campos tienen.
 */
export const COLLECTIONS_DIR = "colecciones";

export interface CollectionEntry {
  path: string;
  fields: Record<string, unknown>;
  body: string;
}

export async function ensureCollection(
  fs: VerneFs,
  project: Project,
  name: string,
  schemaYaml?: string,
): Promise<void> {
  const dir = joinPath(project.dir, COLLECTIONS_DIR, name);
  await fs.mkdir(dir);
  const schemaPath = joinPath(dir, "_schema.yaml");
  if (schemaYaml !== undefined && !(await fs.exists(schemaPath))) {
    await fs.writeTextFile(schemaPath, schemaYaml);
  }
}

export async function listCollection(
  fs: VerneFs,
  project: Project,
  name: string,
): Promise<CollectionEntry[]> {
  const dir = joinPath(project.dir, COLLECTIONS_DIR, name);
  if (!(await fs.exists(dir))) return [];
  const files = (await fs.readDir(dir)).filter(
    (e) => !e.isDirectory && e.name.toLowerCase().endsWith(".md") && !e.name.startsWith("_"),
  );
  const entries: CollectionEntry[] = [];
  for (const file of files) {
    const path = joinPath(dir, file.name);
    const parts = await readDocument(fs, path);
    entries.push({ path, fields: getFrontmatterFields(parts), body: parts.body });
  }
  return entries;
}

export async function addCollectionEntry(
  fs: VerneFs,
  project: Project,
  name: string,
  fileSlug: string,
  fields: Record<string, unknown>,
  body = "",
): Promise<string> {
  await ensureCollection(fs, project, name);
  const dir = joinPath(project.dir, COLLECTIONS_DIR, name);
  let path = joinPath(dir, `${fileSlug}.md`);
  for (let n = 2; await fs.exists(path); n++) {
    path = joinPath(dir, `${fileSlug}-${n}.md`);
  }
  const parts = withFrontmatterFields({ frontmatterRaw: null, body }, fields);
  await writeDocument(fs, path, parts);
  return path;
}

export async function updateCollectionEntry(
  fs: VerneFs,
  path: string,
  changes: Record<string, unknown>,
): Promise<void> {
  const parts = await readDocument(fs, path);
  await writeDocument(fs, path, withFrontmatterFields(parts, changes));
}
