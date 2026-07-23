import { describe, expect, it } from "vitest";
import { toCleanMarkdown, toHtmlDocument, toHtmlFragment } from "../src/html.js";
import { markdownToBlocks } from "../src/ir.js";
import { toManuscriptDocx } from "../src/manuscript.js";

describe("IR: markdown → bloques", () => {
  it("párrafos con énfasis anidado", () => {
    const blocks = markdownToBlocks("Hola *mundo* con **negrita** y ***ambas***.\n");
    expect(blocks).toEqual([
      {
        kind: "paragraph",
        runs: [
          { text: "Hola " },
          { text: "mundo", italic: true },
          { text: " con " },
          { text: "negrita", bold: true },
          { text: " y " },
          { text: "ambas", italic: true, bold: true },
          { text: "." },
        ],
      },
    ]);
  });

  it("regla horizontal = separador de escena; encabezados con nivel", () => {
    const blocks = markdownToBlocks("## Dos\n\nuno\n\n---\n\ndos\n");
    expect(blocks.map((b) => b.kind)).toEqual([
      "heading",
      "paragraph",
      "scene-break",
      "paragraph",
    ]);
    expect(blocks[0]).toMatchObject({ level: 2 });
  });

  it("citas, código y listas", () => {
    const blocks = markdownToBlocks(
      "> cita uno\n\n```\nlínea a\nlínea b\n```\n\n* punto uno\n* punto dos\n\n3. tercero\n",
    );
    expect(blocks[0]).toMatchObject({ kind: "quote" });
    expect(blocks[1]).toMatchObject({ kind: "code", text: "línea a\nlínea b" });
    expect(blocks[2]).toMatchObject({ kind: "list-item", ordered: false });
    expect(blocks[4]).toMatchObject({ kind: "list-item", ordered: true, index: 3 });
  });

  it("los enlaces se aplanan a texto (formato manuscrito) y las entidades se decodifican", () => {
    const blocks = markdownToBlocks("Ver [mi blog](https://x.mx) & «más».\n");
    expect(blocks[0]).toMatchObject({
      kind: "paragraph",
      runs: [{ text: "Ver " }, { text: "mi blog" }, { text: " & «más»." }],
    });
  });
});

describe("HTML", () => {
  it("fragmento limpio sin envoltorio", () => {
    const html = toHtmlFragment({ title: "T", body: "# Título\n\nHola *mundo*.\n" });
    expect(html).toContain("<h1>Título</h1>");
    expect(html).toContain("<em>mundo</em>");
    expect(html).not.toContain("<!doctype");
    expect(html).not.toContain("class=");
  });

  it("documento completo con título escapado e idioma", () => {
    const html = toHtmlDocument({
      title: "Tildes & <etiquetas>",
      body: "Hola.\n",
      language: "es-MX",
    });
    expect(html).toContain("<!doctype html>");
    expect(html).toContain('lang="es-MX"');
    expect(html).toContain("<title>Tildes &amp; &lt;etiquetas&gt;</title>");
  });

  it("markdown limpio: sin líneas vacías de más y con salto final", () => {
    expect(toCleanMarkdown("\n\nHola.\n\n\n")).toBe("Hola.\n");
    expect(toCleanMarkdown("")).toBe("");
  });
});

describe("DOCX manuscrito", () => {
  it("genera un DOCX válido (ZIP) con contenido", async () => {
    const bytes = await toManuscriptDocx({
      title: "El faro",
      author: "Amelia Ruiz",
      contact: ["amelia@ejemplo.mx"],
      body: "La luz giraba.\n\n---\n\nY *seguía* girando con **fuerza**.\n",
    });
    // Magia ZIP: "PK\x03\x04"
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(bytes.length).toBeGreaterThan(1500);
  });

  it("funciona sin autor y con cuerpo vacío", async () => {
    const bytes = await toManuscriptDocx({ title: "Sin nada", body: "" });
    expect(bytes[0]).toBe(0x50);
  });
});
