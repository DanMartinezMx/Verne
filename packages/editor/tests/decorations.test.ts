import { describe, expect, it } from "vitest";
import { buildDecorations, getPlainText } from "../src/decorations.js";
import { markdownToDoc } from "../src/markdown.js";

describe("getPlainText (proyección de texto plano)", () => {
  it("quita la sintaxis Markdown y une bloques con doble salto", () => {
    const doc = markdownToDoc("Hola **mundo**\n\nSegundo párrafo\n");
    expect(getPlainText(doc)).toBe("Hola mundo\n\nSegundo párrafo");
  });

  it("un documento vacío proyecta cadena vacía", () => {
    expect(getPlainText(markdownToDoc(""))).toBe("");
  });
});

describe("buildDecorations (offsets de texto → posiciones ProseMirror)", () => {
  it("mapea un rango al tramo exacto del documento", () => {
    const doc = markdownToDoc("Hola mundo\n\nadiós mundo\n");
    const text = getPlainText(doc);
    const second = text.indexOf("mundo", 5); // la segunda aparición, en otro bloque
    const decos = buildDecorations(doc, [{ from: second, to: second + 5, className: "uc" }]);
    expect(decos).toHaveLength(1);
    expect(doc.textBetween(decos[0]!.from, decos[0]!.to)).toBe("mundo");
  });

  it("un rango que cruza una marca cubre todo el texto sin cortarlo", () => {
    const doc = markdownToDoc("Hola **mundo** feliz\n");
    const text = getPlainText(doc); // "Hola mundo feliz"
    const decos = buildDecorations(doc, [{ from: 0, to: text.length, className: "uc" }]);
    const covered = decos.map((d) => doc.textBetween(d.from, d.to)).join("");
    expect(covered).toBe("Hola mundo feliz");
  });

  it("ignora rangos vacíos o invertidos", () => {
    const doc = markdownToDoc("texto\n");
    expect(buildDecorations(doc, [{ from: 3, to: 3, className: "uc" }])).toEqual([]);
    expect(buildDecorations(doc, [{ from: 4, to: 2, className: "uc" }])).toEqual([]);
  });
});
