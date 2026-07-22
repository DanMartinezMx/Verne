import { lift, setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import { redo, undo } from "prosemirror-history";
import type { MarkType, NodeType } from "prosemirror-model";
import { liftListItem, wrapInList } from "prosemirror-schema-list";
import type { Command, EditorState } from "prosemirror-state";
import { proseSchema as s } from "./markdown.js";

/**
 * API de comandos del editor: la superficie que la UI (barras de formato,
 * menús, atajos de la app) puede invocar sin conocer ProseMirror.
 */
export type EditorCommandName =
  | "toggleBold"
  | "toggleItalic"
  | "toggleCode"
  | "setParagraph"
  | "setHeading1"
  | "setHeading2"
  | "setHeading3"
  | "setCodeBlock"
  | "toggleBulletList"
  | "toggleOrderedList"
  | "toggleBlockquote"
  | "insertHorizontalRule"
  | "setLink"
  | "unsetLink"
  | "undo"
  | "redo";

export interface CommandPayload {
  /** URL para setLink. */
  href?: string;
}

export type BlockKind =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "heading5"
  | "heading6"
  | "code_block"
  | "other";

/** Estado de formato en la selección actual, para pintar la UI. */
export interface FormatState {
  bold: boolean;
  italic: boolean;
  code: boolean;
  link: boolean;
  block: BlockKind;
  bulletList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  selectionEmpty: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

export function commandByName(name: EditorCommandName, payload?: CommandPayload): Command {
  switch (name) {
    case "toggleBold":
      return toggleMark(s.marks.strong);
    case "toggleItalic":
      return toggleMark(s.marks.em);
    case "toggleCode":
      return toggleMark(s.marks.code);
    case "setParagraph":
      return setBlockType(s.nodes.paragraph);
    case "setHeading1":
      return setBlockType(s.nodes.heading, { level: 1 });
    case "setHeading2":
      return setBlockType(s.nodes.heading, { level: 2 });
    case "setHeading3":
      return setBlockType(s.nodes.heading, { level: 3 });
    case "setCodeBlock":
      return setBlockType(s.nodes.code_block);
    case "toggleBulletList":
      return toggleList(s.nodes.bullet_list);
    case "toggleOrderedList":
      return toggleList(s.nodes.ordered_list);
    case "toggleBlockquote":
      return toggleBlockquote;
    case "insertHorizontalRule":
      return insertHorizontalRule;
    case "setLink":
      return setLink(payload);
    case "unsetLink":
      return unsetLink;
    case "undo":
      return undo;
    case "redo":
      return redo;
  }
}

export function computeFormatState(state: EditorState): FormatState {
  const { $from } = state.selection;
  const parent = $from.parent;

  let block: BlockKind = "other";
  if (parent.type === s.nodes.paragraph) block = "paragraph";
  else if (parent.type === s.nodes.code_block) block = "code_block";
  else if (parent.type === s.nodes.heading) {
    const level = Number(parent.attrs["level"]);
    block = (level >= 1 && level <= 6 ? `heading${level}` : "other") as BlockKind;
  }

  return {
    bold: markActive(state, s.marks.strong),
    italic: markActive(state, s.marks.em),
    code: markActive(state, s.marks.code),
    link: markActive(state, s.marks.link),
    block,
    bulletList: isInNode(state, s.nodes.bullet_list),
    orderedList: isInNode(state, s.nodes.ordered_list),
    blockquote: isInNode(state, s.nodes.blockquote),
    selectionEmpty: state.selection.empty,
    canUndo: undo(state),
    canRedo: redo(state),
  };
}

function markActive(state: EditorState, type: MarkType): boolean {
  const { empty, from, to, $from } = state.selection;
  if (empty) return Boolean(type.isInSet(state.storedMarks ?? $from.marks()));
  return state.doc.rangeHasMark(from, to, type);
}

function isInNode(state: EditorState, type: NodeType): boolean {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type === type) return true;
  }
  return false;
}

function toggleList(type: NodeType): Command {
  return (state, dispatch) => {
    if (isInNode(state, type)) return liftListItem(s.nodes.list_item)(state, dispatch);
    return wrapInList(type)(state, dispatch);
  };
}

const toggleBlockquote: Command = (state, dispatch) => {
  if (isInNode(state, s.nodes.blockquote)) return lift(state, dispatch);
  return wrapIn(s.nodes.blockquote)(state, dispatch);
};

const insertHorizontalRule: Command = (state, dispatch) => {
  dispatch?.(state.tr.replaceSelectionWith(s.nodes.horizontal_rule.create()).scrollIntoView());
  return true;
};

function setLink(payload?: CommandPayload): Command {
  return (state, dispatch) => {
    const { empty, from, to } = state.selection;
    const href = payload?.href?.trim();
    if (empty || !href) return false;
    dispatch?.(state.tr.addMark(from, to, s.marks.link.create({ href })).scrollIntoView());
    return true;
  };
}

const unsetLink: Command = (state, dispatch) => {
  const { empty, from, to } = state.selection;
  if (empty) return false;
  dispatch?.(state.tr.removeMark(from, to, s.marks.link));
  return true;
};
