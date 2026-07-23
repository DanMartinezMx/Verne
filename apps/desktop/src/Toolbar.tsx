import type { CommandPayload, EditorCommandName, FormatState } from "@verne/editor";
import { useState } from "react";

interface ToolbarProps {
  state: FormatState | null;
  onCommand: (name: EditorCommandName, payload?: CommandPayload) => void;
}

const BLOCK_OPTIONS: { value: string; label: string; command: EditorCommandName }[] = [
  { value: "paragraph", label: "Texto normal", command: "setParagraph" },
  { value: "heading1", label: "Título 1", command: "setHeading1" },
  { value: "heading2", label: "Título 2", command: "setHeading2" },
  { value: "heading3", label: "Título 3", command: "setHeading3" },
  { value: "code_block", label: "Bloque de código", command: "setCodeBlock" },
];

/** Barra de formato: la cara visible del editor para quien no habla Markdown. */
export function Toolbar({ state, onCommand }: ToolbarProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");

  if (!state) return null;

  const blockValue = BLOCK_OPTIONS.some((o) => o.value === state.block) ? state.block : "other";

  function handleLinkClick() {
    if (!state) return;
    if (state.link) {
      onCommand("unsetLink");
    } else {
      setLinkOpen((open) => !open);
    }
  }

  return (
    <div className="toolbar-wrap">
      <div className="toolbar" role="toolbar" aria-label="Formato de texto">
        <select
          className="toolbar-block"
          aria-label="Tipo de bloque"
          value={blockValue}
          onChange={(e) => {
            const option = BLOCK_OPTIONS.find((o) => o.value === e.target.value);
            if (option) onCommand(option.command);
          }}
        >
          {blockValue === "other" && <option value="other">—</option>}
          {BLOCK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <span className="toolbar-sep" />

        <ToolButton
          label="Negrita"
          shortcut="Ctrl+B"
          pressed={state.bold}
          onClick={() => onCommand("toggleBold")}
        >
          <b>B</b>
        </ToolButton>
        <ToolButton
          label="Cursiva"
          shortcut="Ctrl+I"
          pressed={state.italic}
          onClick={() => onCommand("toggleItalic")}
        >
          <i>I</i>
        </ToolButton>
        <ToolButton
          label="Código en línea"
          shortcut="Ctrl+`"
          pressed={state.code}
          onClick={() => onCommand("toggleCode")}
        >
          <code>{"<>"}</code>
        </ToolButton>
        <ToolButton
          label={state.link ? "Quitar enlace" : "Enlace"}
          pressed={state.link || linkOpen}
          disabled={state.selectionEmpty && !state.link}
          onClick={handleLinkClick}
        >
          🔗
        </ToolButton>

        <span className="toolbar-sep" />

        <ToolButton
          label="Lista con viñetas"
          pressed={state.bulletList}
          onClick={() => onCommand("toggleBulletList")}
        >
          ••
        </ToolButton>
        <ToolButton
          label="Lista numerada"
          pressed={state.orderedList}
          onClick={() => onCommand("toggleOrderedList")}
        >
          1.
        </ToolButton>
        <ToolButton
          label="Cita"
          pressed={state.blockquote}
          onClick={() => onCommand("toggleBlockquote")}
        >
          ❝
        </ToolButton>
        <ToolButton label="Separador de escena" onClick={() => onCommand("insertHorizontalRule")}>
          ⁂
        </ToolButton>

        <span className="toolbar-sep" />

        <ToolButton
          label="Deshacer"
          shortcut="Ctrl+Z"
          disabled={!state.canUndo}
          onClick={() => onCommand("undo")}
        >
          ↩
        </ToolButton>
        <ToolButton
          label="Rehacer"
          shortcut="Ctrl+Y"
          disabled={!state.canRedo}
          onClick={() => onCommand("redo")}
        >
          ↪
        </ToolButton>
      </div>

      {linkOpen && (
        <form
          className="link-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (href.trim()) {
              onCommand("setLink", { href: href.trim() });
              setHref("");
              setLinkOpen(false);
            }
          }}
        >
          <input
            autoFocus
            type="url"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="https://…"
            aria-label="URL del enlace"
          />
          <button type="submit">Enlazar</button>
          <button type="button" onClick={() => setLinkOpen(false)}>
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}

function ToolButton({
  label,
  shortcut,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="toolbar-btn"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={pressed ?? false}
      disabled={disabled ?? false}
      // El editor no debe perder la selección al pulsar el botón:
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
