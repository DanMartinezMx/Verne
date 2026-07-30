import { EditorState, TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vitest";
import { docToMarkdown, proseSchema } from "../src/markdown.js";
import { applySceneHeading, SCENE_RE } from "../src/scene.js";

const s = proseSchema;

/** Documento con un párrafo suelto: el texto empieza en 1. */
function loneParagraph(text: string): EditorState {
  const doc = s.node("doc", null, [s.node("paragraph", null, [s.text(text)])]);
  return EditorState.create({
    doc,
    selection: TextSelection.create(doc, 1 + text.length),
  });
}

/** El mismo texto dentro de una cita: el diálogo de un guion. */
function insideQuote(text: string): EditorState {
  const doc = s.node("doc", null, [
    s.node("blockquote", null, [s.node("paragraph", null, [s.text(text)])]),
  ]);
  return EditorState.create({ doc, selection: TextSelection.create(doc, 2 + text.length) });
}

describe("encabezado de escena (INT./EXT.)", () => {
  it("reconoce las formas del formato, con y sin punto", () => {
    for (const prefix of ["INT. ", "EXT. ", "int. ", "INT ", "INT./EXT. ", "I/E. ", "ext "]) {
      expect(SCENE_RE.test(prefix), prefix).toBe(true);
    }
  });

  it("no se dispara con palabras que empiezan igual", () => {
    for (const text of ["INTERIOR ", "Internet ", "EXTRA ", "INT.CASA ", "hola INT. "]) {
      expect(SCENE_RE.test(text), text).toBe(false);
    }
  });

  /**
   * Lo que distingue esta regla de `textblockTypeInputRule`: el prefijo escrito
   * se conserva. Si se perdiera, la escena se quedaría sin su propio "INT.".
   */
  it("convierte el párrafo en encabezado SIN comerse el texto escrito", () => {
    const state = loneParagraph("INT. ");
    const tr = applySceneHeading(state, 1, 6);
    expect(tr).not.toBeNull();
    const block = state.apply(tr!).doc.firstChild!;
    expect(block.type).toBe(s.nodes.heading);
    expect(block.attrs["level"]).toBe(2);
    expect(block.textContent).toBe("INT. ");
  });

  it("al guardar sale como la convención que documenta el espacio Guion", () => {
    const state = loneParagraph("INT. ");
    const asHeading = state.apply(applySceneHeading(state, 1, 6)!);
    // Se completa la escena como haría quien escribe.
    const done = asHeading.apply(asHeading.tr.insertText("CASA DE AMELIA — NOCHE"));
    expect(docToMarkdown(done.doc).trim()).toBe("## INT. CASA DE AMELIA — NOCHE");
  });

  /**
   * En un guion el diálogo va en cita (`>`), y ahí `parent` también es un
   * párrafo: sin mirar la profundidad, teclear "INT. " en un diálogo lo
   * convertiría en encabezado y rompería la cita.
   */
  it("no toca un párrafo que está dentro de una cita", () => {
    const state = insideQuote("INT. ");
    expect(applySceneHeading(state, 2, 7)).toBeNull();
  });

  it("no toca un encabezado que ya lo es", () => {
    const doc = s.node("doc", null, [
      s.node("heading", { level: 2 }, [s.text("INT. ")]),
    ]);
    const state = EditorState.create({ doc, selection: TextSelection.create(doc, 6) });
    expect(applySceneHeading(state, 1, 6)).toBeNull();
  });
});
