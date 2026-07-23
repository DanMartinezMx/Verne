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

/** Una versión guardada de un documento en .verne/history/. */
export interface Snapshot {
  /** Ruta absoluta del archivo de snapshot. */
  path: string;
  /** Fecha del snapshot (ISO) reconstruida del nombre, o null si es ilegible. */
  takenAt: string | null;
  /** Palabras del cuerpo en ese momento (para dar contexto en la lista). */
  words: number;
}

/** Carpeta de historial de un documento (espeja su ruta relativa al proyecto). */
export function historyDirFor(project: Project, docPath: string): string {
  const relative = docPath.startsWith(project.dir)
    ? docPath.slice(project.dir.length).replace(/^[/\\]+/, "")
    : docPath;
  return joinPath(project.dir, INTERNAL_DIR, "history", relative);
}

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
  const historyDir = historyDirFor(project, docPath);
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

/**
 * Lista las versiones guardadas de un documento, de la más reciente a la más
 * antigua. Hace visible el historial que ya existía en disco: el argumento de
 * venta ("nunca pierdes nada") deja de estar enterrado en .verne/.
 */
export async function listSnapshots(
  fs: VerneFs,
  project: Project,
  docPath: string,
): Promise<Snapshot[]> {
  const historyDir = historyDirFor(project, docPath);
  if (!(await fs.exists(historyDir))) return [];
  const names = (await fs.readDir(historyDir))
    .filter((e) => !e.isDirectory && e.name.endsWith(".md"))
    .map((e) => e.name)
    .sort()
    .reverse(); // el nombre es cronológico: invertido = más reciente primero
  const snapshots: Snapshot[] = [];
  for (const name of names) {
    const path = joinPath(historyDir, name);
    const { body } = splitFrontmatter(await fs.readTextFile(path));
    snapshots.push({ path, takenAt: isoFromSnapshotName(name), words: countWords(body) });
  }
  return snapshots;
}

/**
 * Restaura una versión: primero respalda el estado actual como un snapshot más
 * (restaurar nunca debe perder lo que hay), luego escribe la versión elegida
 * sobre el documento.
 */
export async function restoreSnapshot(
  fs: VerneFs,
  project: Project,
  docPath: string,
  snapshotPath: string,
): Promise<void> {
  const contents = await fs.readTextFile(snapshotPath);
  await snapshotDocument(fs, project, docPath);
  await fs.writeTextFile(docPath, contents);
}

/** 2026-07-23T17-33-07-123Z-001.md → 2026-07-23T17:33:07.123Z */
function isoFromSnapshotName(name: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z-[0-9a-z]{3}\.md$/.exec(name);
  return m ? `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z` : null;
}
