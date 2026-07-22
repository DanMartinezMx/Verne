import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { joinDocument, splitFrontmatter } from "@verne/core";
import { describe, expect, it } from "vitest";
import { markdownToDoc, normalizeMarkdown } from "../src/markdown.js";

/**
 * Integración: los proyectos de examples/ pasan por el mismo pipeline que usa
 * la app (separar frontmatter → editor → serializar → unir) sin perder nada.
 */
const EXAMPLES = [
  "../../../examples/blog-demo/contenido/hola-mundo.md",
  "../../../examples/cuentos-demo/contenido/01-en-curso/el-faro.md",
];

describe("pipeline completo con los proyectos de ejemplo", () => {
  for (const relative of EXAMPLES) {
    it(`abrir → guardar es estable y sin pérdida: ${relative.split("/").pop()}`, async () => {
      const raw = await readFile(join(import.meta.dirname, relative), "utf8");
      const parts = splitFrontmatter(raw);

      // El frontmatter jamás pasa por el editor: byte a byte intacto.
      expect(joinDocument(parts)).toBe(raw);

      // El cuerpo sobrevive al editor: texto intacto, segunda pasada estable.
      const saved = normalizeMarkdown(parts.body);
      expect(markdownToDoc(saved).textContent).toBe(markdownToDoc(parts.body).textContent);
      expect(normalizeMarkdown(saved)).toBe(saved);
    });
  }
});
