import { isMap, parseDocument } from "yaml";
import type { DocumentParts } from "./document.js";

/**
 * Lectura y edición estructurada del frontmatter.
 *
 * Regla VPF: cuando Verne NO edita metadatos, el frontmatter se preserva
 * byte a byte (document.ts). Cuando SÍ los edita, usa la API de documento
 * de YAML para tocar solo los campos cambiados: los campos desconocidos y
 * los comentarios del usuario sobreviven.
 */

const INNER_RE = /^---\r?\n([\s\S]*?)\r?\n?(?:---|\.\.\.)(?:\r?\n)?$/;

export function getFrontmatterFields(parts: DocumentParts): Record<string, unknown> {
  if (!parts.frontmatterRaw) return {};
  const inner = INNER_RE.exec(parts.frontmatterRaw)?.[1] ?? "";
  const parsed: unknown = parseDocument(inner).toJS();
  return typeof parsed === "object" && parsed !== null
    ? (parsed as Record<string, unknown>)
    : {};
}

/**
 * Devuelve las partes con los campos aplicados. `undefined` borra el campo.
 * Si el resultado queda sin campos, el documento queda sin frontmatter.
 */
export function withFrontmatterFields(
  parts: DocumentParts,
  changes: Record<string, unknown>,
): DocumentParts {
  const inner = parts.frontmatterRaw
    ? (INNER_RE.exec(parts.frontmatterRaw)?.[1] ?? "")
    : "";
  const doc = parseDocument(inner);
  if (!isMap(doc.contents)) {
    doc.contents = doc.createNode({}) as unknown as typeof doc.contents;
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) {
      doc.delete(key);
    } else {
      doc.set(key, value);
    }
  }
  const isEmpty = !isMap(doc.contents) || doc.contents.items.length === 0;
  if (isEmpty) {
    return { frontmatterRaw: null, body: parts.body };
  }
  const yamlText = doc.toString().replace(/\n*$/, "\n");
  return { frontmatterRaw: `---\n${yamlText}---\n`, body: parts.body };
}

/**
 * Cada cuánto se refresca como mínimo una fecha de modificación. Guardar es
 * automático (cada pocos segundos mientras escribes), y sellar el instante en
 * cada guardado dejaría un `updatedAt` distinto por pulsación: ruido en el
 * historial de git y ninguna información nueva.
 */
export const STAMP_INTERVAL_MS = 60_000;

/**
 * Sella la fecha actual en los campos indicados, si hace falta. Devuelve las
 * mismas partes sin tocar cuando ninguna fecha ha caducado, para que el
 * frontmatter se preserve byte a byte en el caso normal (regla VPF).
 */
export function stampSaveDates(
  parts: DocumentParts,
  keys: readonly string[],
  now: Date = new Date(),
  intervalMs: number = STAMP_INTERVAL_MS,
): DocumentParts {
  if (keys.length === 0) return parts;
  const fields = getFrontmatterFields(parts);
  const changes: Record<string, unknown> = {};
  for (const key of keys) {
    const previous = Date.parse(String(fields[key] ?? ""));
    const stale = Number.isNaN(previous) || now.getTime() - previous >= intervalMs;
    if (stale) changes[key] = now.toISOString();
  }
  return Object.keys(changes).length === 0 ? parts : withFrontmatterFields(parts, changes);
}

/** Nombre del campo de etiquetas cuando el espacio no dice otro. */
export const DEFAULT_TAGS_FIELD = "tags";

/**
 * Normaliza el campo de etiquetas a lista de strings, tolerando string suelto.
 * El nombre del campo lo decide el espacio (`tagsField`): el blog usa
 * `categories` porque su sitio lo exige. core no conoce los espacios, así que lo
 * recibe como parámetro.
 */
export function readTags(
  fields: Record<string, unknown>,
  field: string = DEFAULT_TAGS_FIELD,
): string[] {
  const raw = fields[field];
  if (Array.isArray(raw)) return raw.map(String).filter((t) => t.trim() !== "");
  if (typeof raw === "string" && raw.trim() !== "") return [raw.trim()];
  return [];
}
