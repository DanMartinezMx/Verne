import type { Command } from "prosemirror-state";
import { EditorState, TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vitest";
import { commandByName, computeFormatState } from "../src/commands.js";
import { docToMarkdown, markdownToDoc } from "../src/markdown.js";

/** Estado con selección [from, to] (posiciones ProseMirror; el texto de un
 *  párrafo inicial empieza en 1). */
function stateFrom(markdown: string, from?: number, to?: number): EditorState {
  const doc = markdownToDoc(markdown);
  return EditorState.create({
    doc,
    selection: from !== undefined ? TextSelection.create(doc, from, to ?? from) : undefined,
  });
}

function apply(state: EditorState, command: Command): EditorState {
  let next = state;
  const ok = command(state, (tr) => {
    next = state.apply(tr);
  });
  expect(ok).toBe(true);
  return next;
}

describe("comandos de formato", () => {
  it("toggleBold envuelve la selección y se refleja en el estado de formato", () => {
    let state = stateFrom("hola mundo\n", 1, 5);
    expect(computeFormatState(state).bold).toBe(false);
    state = apply(state, commandByName("toggleBold"));
    expect(docToMarkdown(state.doc)).toBe("**hola** mundo");
    expect(computeFormatState(state).bold).toBe(true);
    state = apply(state, commandByName("toggleBold"));
    expect(docToMarkdown(state.doc)).toBe("hola mundo");
  });

  it("setHeading2 y vuelta a párrafo", () => {
    let state = stateFrom("hola mundo\n", 1);
    state = apply(state, commandByName("setHeading2"));
    expect(docToMarkdown(state.doc)).toBe("## hola mundo");
    expect(computeFormatState(state).block).toBe("heading2");
    state = apply(state, commandByName("setParagraph"));
    expect(computeFormatState(state).block).toBe("paragraph");
  });

  it("toggleBulletList envuelve y desenvuelve", () => {
    let state = stateFrom("hola mundo\n", 1);
    state = apply(state, commandByName("toggleBulletList"));
    expect(docToMarkdown(state.doc)).toBe("* hola mundo");
    expect(computeFormatState(state).bulletList).toBe(true);
    state = apply(state, commandByName("toggleBulletList"));
    expect(docToMarkdown(state.doc)).toBe("hola mundo");
  });

  it("toggleBlockquote envuelve y desenvuelve", () => {
    let state = stateFrom("una cita\n", 1);
    state = apply(state, commandByName("toggleBlockquote"));
    expect(docToMarkdown(state.doc)).toBe("> una cita");
    expect(computeFormatState(state).blockquote).toBe(true);
    state = apply(state, commandByName("toggleBlockquote"));
    expect(docToMarkdown(state.doc)).toBe("una cita");
  });

  it("setLink y unsetLink sobre la selección", () => {
    let state = stateFrom("visita mi blog\n", 8, 15);
    state = apply(state, commandByName("setLink", { href: "https://ejemplo.mx" }));
    expect(docToMarkdown(state.doc)).toBe("visita [mi blog](https://ejemplo.mx)");
    expect(computeFormatState(state).link).toBe(true);
    state = apply(state, commandByName("unsetLink"));
    expect(docToMarkdown(state.doc)).toBe("visita mi blog");
  });

  it("setLink sin selección o sin URL no hace nada", () => {
    const state = stateFrom("hola\n", 1);
    expect(commandByName("setLink", { href: "https://x" })(state, undefined)).toBe(false);
    const withSel = stateFrom("hola\n", 1, 4);
    expect(commandByName("setLink", {})(withSel, undefined)).toBe(false);
  });

  it("insertHorizontalRule inserta la regla", () => {
    let state = stateFrom("arriba\n", 7);
    state = apply(state, commandByName("insertHorizontalRule"));
    expect(docToMarkdown(state.doc)).toContain("---");
  });

  it("computeFormatState detecta bloque de código y selección vacía", () => {
    const state = stateFrom("```\ncódigo\n```\n", 1);
    const fs = computeFormatState(state);
    expect(fs.block).toBe("code_block");
    expect(fs.selectionEmpty).toBe(true);
    expect(fs.canUndo).toBe(false);
  });
});
