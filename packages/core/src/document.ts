import { joinPath, type VerneFs } from "./fs.js";
import { INTERNAL_DIR, type Project } from "./project.js";

/**
 * Un documento VPF = frontmatter YAML opcional (preservado VERBATIM, byte a
 * byte: el editor de M1 solo edita el cuerpo) + cuerpo Markdown.
 */
export interface DocumentParts {
  /** Bloque completo de frontmatter, delimitadores incluidos, o null. */
  frontmatterRaw: string | null;
  body: string;
}

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/;

export function splitFrontmatter(text: string): DocumentParts {
  const match = FRONTMATTER_RE.exec(text);
  if (!match) return { frontmatterRaw: null, body: text };
  return { frontmatterRaw: match[0], body: text.slice(match[0].length) };
}

export function joinDocument(parts: DocumentParts): string {
  const body = parts.body.endsWith("\n") || parts.body === "" ? parts.body : `${parts.body}\n`;
  return (parts.frontmatterRaw ?? "") + body;
}

export async function readDocument(fs: VerneFs, path: string): Promise<DocumentParts> {
  return splitFrontmatter(await fs.readTextFile(path));
}

export async function writeDocument(
  fs: VerneFs,
  path: string,
  parts: DocumentParts,
): Promise<void> {
  await fs.writeTextFile(path, joinDocument(parts));
}

/** Palabras = secuencias con al menos una letra o dígito (unicode). */
export function countWords(text: string): number {
  const matches = text.match(/[\p{L}\p{N}]+(?:[''’\-.][\p{L}\p{N}]+)*/gu);
  return matches ? matches.length : 0;
}

/** Cuántos snapshots conservamos por documento antes de podar los más viejos. */
export const SNAPSHOT_KEEP = 20;

/**
 * Guarda una copia de seguridad del documento en .verne/history/ (historial
 * fino: prescindible por contrato VPF, valiosísimo el día que algo sale mal).
 * La app la invoca antes de la primera escritura de cada sesión de edición.
 */
export async function snapshotDocument(
  fs: VerneFs,
  project: Project,
  docPath: string,
): Promise<void> {
  if (!(await fs.exists(docPath))) return;
  const relative = docPath.startsWith(project.dir)
    ? docPath.slice(project.dir.length).replace(/^[/\\]+/, "")
    : docPath;
  const historyDir = joinPath(project.dir, INTERNAL_DIR, "history", relative);
  await fs.mkdir(historyDir);
  // Sufijo de secuencia monotónica: varios snapshots en el mismo milisegundo
  // no colisionan y su orden por nombre sigue siendo el orden real de escritura.
  const stamp = `${new Date().toISOString().replace(/[:.]/g, "-")}-${nextSnapshotSeq()}`;
  await fs.writeTextFile(joinPath(historyDir, `${stamp}.md`), await fs.readTextFile(docPath));
  await pruneSnapshots(fs, historyDir);
}

let snapshotSeq = 0;

function nextSnapshotSeq(): string {
  snapshotSeq = (snapshotSeq + 1) % 46656; // base36 de 3 dígitos
  return snapshotSeq.toString(36).padStart(3, "0");
}

async function pruneSnapshots(fs: VerneFs, historyDir: string): Promise<void> {
  const entries = (await fs.readDir(historyDir))
    .filter((e) => !e.isDirectory && e.name.endsWith(".md"))
    .map((e) => e.name)
    .sort(); // el nombre es un timestamp ISO: orden lexicográfico = cronológico
  for (const name of entries.slice(0, Math.max(0, entries.length - SNAPSHOT_KEEP))) {
    await fs.remove(joinPath(historyDir, name));
  }
}
