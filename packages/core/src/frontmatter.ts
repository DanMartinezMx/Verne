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

/** Normaliza el campo `tags` a lista de strings, tolerando string suelto. */
export function readTags(fields: Record<string, unknown>): string[] {
  const raw = fields["tags"];
  if (Array.isArray(raw)) return raw.map(String).filter((t) => t.trim() !== "");
  if (typeof raw === "string" && raw.trim() !== "") return [raw.trim()];
  return [];
}
