import type { UnknownWord } from "@verne/core";
import { useState } from "react";

interface SpellingPanelProps {
  title: string;
  /** Palabras desconocidas del documento, la más repetida primero. */
  unknown: UnknownWord[];
  /** Palabras que ya están en el diccionario del proyecto. */
  customWords: string[];
  onAdd: (words: string[]) => void;
  onClose: () => void;
}

/**
 * Panel de ortografía (RFC-0004 §7): las palabras desconocidas del documento con
 * su recuento, y añadirlas al diccionario del proyecto.
 *
 * Es la alternativa deliberada al menú contextual con clic derecho: un novelista
 * tiene diez nombres de personaje repetidos trescientas veces, y quiere añadirlos
 * de una vez — no uno por aparición. Además no exige que el editor exponga clics
 * sobre las decoraciones.
 */
export function SpellingPanel(props: SpellingPanelProps) {
  const [chosen, setChosen] = useState<Set<string>>(new Set());

  function toggle(word: string) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  }

  const total = props.unknown.reduce((sum, u) => sum + u.count, 0);

  return (
    <section className="spelling">
      <header className="export-header">
        <h2>Ortografía de “{props.title}”</h2>
        <button type="button" onClick={props.onClose}>
          ← Volver al documento
        </button>
      </header>

      {props.unknown.length === 0 ? (
        <p className="placeholder">
          Ninguna palabra desconocida en este documento.
        </p>
      ) : (
        <>
          <p className="export-note">
            {props.unknown.length === 1
              ? "1 palabra desconocida"
              : `${props.unknown.length} palabras desconocidas`}
            {total !== props.unknown.length && `, ${total} apariciones`}. Marca las que sean
            correctas —nombres de personajes, lugares inventados— y añádelas al diccionario del
            proyecto: viven en <code>diccionario.txt</code>, junto a tus textos.
          </p>

          <ul className="spelling-list">
            {props.unknown.map((word) => (
              <li key={word.word}>
                <label className="spelling-word">
                  <input
                    type="checkbox"
                    checked={chosen.has(word.word)}
                    onChange={() => toggle(word.word)}
                  />
                  <span className="spelling-term">{word.word}</span>
                  {word.count > 1 && <span className="spelling-count">×{word.count}</span>}
                  {word.suggestions.length > 0 && (
                    <span className="spelling-suggestions">
                      ¿{word.suggestions.join(", ")}?
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>

          <div className="export-actions">
            <button
              type="submit"
              disabled={chosen.size === 0}
              onClick={() => {
                props.onAdd([...chosen]);
                setChosen(new Set());
              }}
            >
              {chosen.size === 0
                ? "Añadir al diccionario"
                : `Añadir ${chosen.size} al diccionario`}
            </button>
            <button
              type="button"
              disabled={props.unknown.length === 0}
              onClick={() => setChosen(new Set(props.unknown.map((u) => u.word)))}
            >
              Marcar todas
            </button>
          </div>
        </>
      )}

      {props.customWords.length > 0 && (
        <div className="export-card">
          <h3>Diccionario del proyecto ({props.customWords.length})</h3>
          <p className="export-note">
            Estas palabras ya no se marcan. Es un archivo de texto: puedes editarlo a mano,
            viaja al copiar la carpeta y se versiona con git.
          </p>
          <p className="spelling-custom">{props.customWords.join(" · ")}</p>
        </div>
      )}
    </section>
  );
}
