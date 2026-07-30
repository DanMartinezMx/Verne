import type { CompiledManuscript, CompiledPart, TreeNode } from "@verne/core";
import { useState } from "react";

interface ManuscriptPanelProps {
  compiled: CompiledManuscript;
  /** Meta de palabras de la obra (`target` del manifiesto). */
  target: number;
  onChangeTarget: (target: number) => void;
  onSelect: (node: TreeNode) => void;
  /** Exporta la obra completa como un solo documento. */
  onCompile: () => void;
}

/**
 * El manuscrito de una obra larga: cuánto llevas, por capítulo y en total, y
 * compilarlo todo en un documento.
 *
 * NO es gamificación (RFC-0003 §3): un número y una barra. Sin rachas, sin
 * insignias, sin notificaciones y sin nada que castigue no haber escrito hoy.
 */
export function ManuscriptPanel(props: ManuscriptPanelProps) {
  const { words } = props.compiled;
  const percent = props.target > 0 ? Math.round((words / props.target) * 100) : 0;
  const chapters = props.compiled.parts.filter((p) => p.body !== "" || p.words > 0);
  const longest = Math.max(1, ...chapters.map((p) => p.words));

  return (
    <section className="manuscript">
      <header className="manuscript-header">
        <h2>Manuscrito</h2>
        <button type="button" onClick={props.onCompile}>
          Compilar en un documento…
        </button>
      </header>

      <div className="manuscript-progress">
        <p className="manuscript-count">
          <strong>{words.toLocaleString("es")}</strong> palabras
          {props.target > 0 && (
            <>
              {" de "}
              <TargetInput target={props.target} onChange={props.onChangeTarget} />
              <span className="manuscript-percent">{percent}%</span>
            </>
          )}
        </p>
        {props.target > 0 && (
          <progress value={Math.min(words, props.target)} max={props.target}>
            {percent}%
          </progress>
        )}
      </div>

      {props.compiled.parts.length === 0 ? (
        <p className="placeholder">
          Todavía no hay capítulos. Crea el primero y aquí verás el avance de la obra.
        </p>
      ) : (
        <ol className="manuscript-parts">
          {props.compiled.parts.map((part) => (
            <li
              key={part.path}
              className={part.body === "" && part.words === 0 ? "manuscript-part--folder" : ""}
              style={{ paddingLeft: `${part.depth * 1.1}rem` }}
            >
              <PartRow part={part} longest={longest} onSelect={props.onSelect} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Una parte del manuscrito: capítulo (se abre) o carpeta (solo estructura). */
function PartRow({
  part,
  longest,
  onSelect,
}: {
  part: CompiledPart;
  longest: number;
  onSelect: (node: TreeNode) => void;
}) {
  const isFolder = part.body === "" && part.words === 0;
  if (isFolder) {
    return <span className="manuscript-folder">{part.title}</span>;
  }
  const name = part.path.split("/").pop()?.replace(/\.md$/i, "") ?? part.title;
  return (
    <button
      type="button"
      className="manuscript-part"
      onClick={() => onSelect({ name, path: part.path, kind: "document" })}
    >
      <span className="manuscript-part-title">{part.title}</span>
      {/* Barra proporcional al capítulo más largo: se ve de un vistazo cuál se
          quedó corto, que es la pregunta real al revisar una novela. */}
      <span className="manuscript-bar" aria-hidden="true">
        <span style={{ width: `${Math.round((part.words / longest) * 100)}%` }} />
      </span>
      <span className="manuscript-part-words">{part.words.toLocaleString("es")}</span>
    </button>
  );
}

/** La meta se edita aquí mismo: es lo único que distingue novela corta de larga. */
function TargetInput({
  target,
  onChange,
}: {
  target: number;
  onChange: (target: number) => void;
}) {
  const [text, setText] = useState(String(target));

  function commit() {
    const parsed = Number(text.replace(/\D/g, ""));
    if (Number.isFinite(parsed) && parsed > 0 && parsed !== target) onChange(parsed);
    else setText(String(target));
  }

  return (
    <input
      className="manuscript-target"
      value={text}
      aria-label="Meta de palabras"
      inputMode="numeric"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}
