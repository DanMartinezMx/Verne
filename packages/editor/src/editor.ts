import { baseKeymap, toggleMark } from "prosemirror-commands";
import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";
import { history, redo, undo } from "prosemirror-history";
import {
  inputRules,
  smartQuotes,
  textblockTypeInputRule,
  wrappingInputRule,
} from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import { liftListItem, sinkListItem, splitListItem } from "prosemirror-schema-list";
import { EditorState, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { docToMarkdown, markdownToDoc, proseSchema } from "./markdown.js";

export interface ProseEditorOptions {
  parent: HTMLElement;
  initialMarkdown: string;
  /** Se invoca en cada transacción que cambia el documento. */
  onDocChanged?: () => void;
}

export interface ProseEditorHandle {
  getMarkdown(): string;
  focus(): void;
  destroy(): void;
}

/**
 * Crea un editor de prosa sobre un elemento del DOM. API agnóstica de
 * framework: la UI (React hoy) solo monta, escucha cambios y pide el
 * Markdown. ProseMirror no se expone fuera de este paquete (RFC-0001 §7.2).
 */
export function createProseEditor(options: ProseEditorOptions): ProseEditorHandle {
  const state = EditorState.create({
    doc: markdownToDoc(options.initialMarkdown),
    plugins: buildPlugins(),
  });

  const view = new EditorView(options.parent, {
    state,
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr));
      if (tr.docChanged) options.onDocChanged?.();
    },
  });

  return {
    getMarkdown: () => docToMarkdown(view.state.doc),
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
}

function buildPlugins(): Plugin[] {
  const s = proseSchema;
  return [
    buildInputRules(),
    keymap({
      "Mod-z": undo,
      "Mod-y": redo,
      "Mod-Shift-z": redo,
      "Mod-b": toggleMark(s.marks.strong),
      "Mod-i": toggleMark(s.marks.em),
      "Mod-`": toggleMark(s.marks.code),
      Enter: splitListItem(s.nodes.list_item),
      Tab: sinkListItem(s.nodes.list_item),
      "Shift-Tab": liftListItem(s.nodes.list_item),
    }),
    keymap(baseKeymap),
    history(),
    dropCursor(),
    gapCursor(),
  ];
}

/** Escritura fluida: los prefijos Markdown se convierten en bloques al vuelo. */
function buildInputRules(): Plugin {
  const s = proseSchema;
  return inputRules({
    rules: [
      ...smartQuotes,
      textblockTypeInputRule(/^(#{1,6})\s$/, s.nodes.heading, (match) => ({
        level: match[1]?.length ?? 1,
      })),
      wrappingInputRule(/^\s*>\s$/, s.nodes.blockquote),
      wrappingInputRule(/^\s*([-+*])\s$/, s.nodes.bullet_list),
      wrappingInputRule(
        /^(\d+)\.\s$/,
        s.nodes.ordered_list,
        (match) => ({ order: Number(match[1]) }),
        (match, node) => node.childCount + (node.attrs["order"] as number) === Number(match[1]),
      ),
      textblockTypeInputRule(/^```$/, s.nodes.code_block),
    ],
  });
}
