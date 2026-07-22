import type { Node } from "prosemirror-model";
import {
  defaultMarkdownParser,
  defaultMarkdownSerializer,
  schema,
} from "prosemirror-markdown";

/**
 * Esquema de prosa de M1: el de prosemirror-markdown, que garantiza
 * paridad exacta con su parser y su serializer. Los esquemas por
 * Blueprint (guion, ficha…) llegarán con sus hitos (RFC-0001 §7.1).
 */
export const proseSchema = schema;

export function markdownToDoc(markdown: string): Node {
  return defaultMarkdownParser.parse(markdown);
}

export function docToMarkdown(doc: Node): string {
  return defaultMarkdownSerializer.serialize(doc, { tightLists: true });
}

/**
 * Contrato de round-trip de Verne (RFC-0002 hito M1):
 *  1. Sin pérdida semántica: parsear lo serializado reproduce el mismo doc.
 *  2. Estabilidad: serializar es idempotente tras la primera normalización
 *     (un documento guardado por Verne nunca vuelve a cambiar de bytes al
 *     pasar por abrir → guardar).
 * La suite de tortura de tests/roundtrip.test.ts verifica ambas cosas.
 */
export function normalizeMarkdown(markdown: string): string {
  return docToMarkdown(markdownToDoc(markdown));
}
