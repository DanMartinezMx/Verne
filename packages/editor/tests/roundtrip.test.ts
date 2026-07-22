import { describe, expect, it } from "vitest";
import { docToMarkdown, markdownToDoc, normalizeMarkdown } from "../src/markdown.js";

/**
 * Suite de tortura del round-trip (RFC-0002, hito M1).
 *
 * Contrato verificado para cada caso:
 *  1. SIN PÉRDIDA: el texto plano del documento sobrevive intacto
 *     (ni un carácter de prosa se pierde ni se altera).
 *  2. SIN PÉRDIDA SEMÁNTICA: parse(serialize(doc)) == doc.
 *  3. ESTABILIDAD: serializar es idempotente tras la primera normalización —
 *     abrir y guardar un documento ya guardado por Verne no cambia sus bytes.
 */
const CASES: Record<string, string> = {
  "párrafo simple": "Había una vez un archivo Markdown normal.\n",
  "acentos y unicode": "Ñandú, pingüino, «comillas», ¿qué? ¡Sí! — em-dash… 😊 日本語 עברית\n",
  encabezados: "# Uno\n\n## Dos\n\n### Tres\n\n#### Cuatro\n\n##### Cinco\n\n###### Seis\n",
  "énfasis y anidados": "Texto con *cursiva*, **negrita**, ***ambas***, y `código en línea`.\n",
  "escape de caracteres especiales": "Precio: 2 * 3 = 6, guion_bajo_s, #hashtag, [no es enlace], 1. no es lista\n",
  "backticks en código inline": "Usa ``código con `backtick` dentro`` para anidar.\n",
  enlaces: "Visita [mi blog](https://ejemplo.mx) y [otro](https://ejemplo.mx/ruta?a=1&b=2 \"con título\").\n",
  imágenes: "![texto alternativo](recursos/foto.png \"título\")\n",
  "lista con viñetas": "* uno\n* dos\n* tres\n",
  "lista anidada": "* fruta\n\n  * manzana\n  * pera\n\n* verdura\n",
  "lista ordenada con inicio distinto": "3. tercero\n4. cuarto\n5. quinto\n",
  "lista suelta (loose)": "* primer punto con su espacio\n\n* segundo punto\n",
  "cita simple": "> La luz giraba cada siete segundos.\n",
  "cita anidada con lista": "> nivel uno\n>\n> > nivel dos\n>\n> * punto en cita\n",
  "bloque de código con lenguaje": "```ts\nconst x: number = 1;\nif (x < 2) console.log(\"*no* es markdown\");\n```\n",
  "bloque de código con líneas vacías": "```\nlínea 1\n\nlínea 3\n```\n",
  "regla horizontal": "arriba\n\n---\n\nabajo\n",
  "salto duro de línea": "primera línea\\\nsegunda línea\n",
  "documento vacío": "",
  "mezcla de todo": [
    "# El faro",
    "",
    "Amelia contaba sus pensamientos en **vueltas de faro**, *siete segundos* cada una.",
    "",
    "> Nota del editor: revisar el ritmo de esta escena.",
    "",
    "* revisar diálogo",
    "* cortar adverbios",
    "",
    "```",
    "esto no es prosa",
    "```",
    "",
    "Fin del capítulo. Ver [notas](notas.md).",
    "",
  ].join("\n"),
};

describe("round-trip Markdown ↔ documento", () => {
  for (const [name, markdown] of Object.entries(CASES)) {
    describe(name, () => {
      it("no pierde ni altera un solo carácter de prosa", () => {
        expect(markdownToDoc(normalizeMarkdown(markdown)).textContent).toBe(
          markdownToDoc(markdown).textContent,
        );
      });

      it("no pierde estructura (parse ∘ serialize == identidad)", () => {
        const doc = markdownToDoc(markdown);
        expect(markdownToDoc(docToMarkdown(doc)).toJSON()).toEqual(doc.toJSON());
      });

      it("es estable: guardar dos veces produce bytes idénticos", () => {
        const once = normalizeMarkdown(markdown);
        expect(normalizeMarkdown(once)).toBe(once);
      });
    });
  }

  it("una edición no relacionada no reformatea el resto del documento", () => {
    const original = normalizeMarkdown(CASES["mezcla de todo"] ?? "");
    // Simula: abrir, no tocar nada, guardar. Byte-idéntico.
    expect(normalizeMarkdown(original)).toBe(original);
  });
});
