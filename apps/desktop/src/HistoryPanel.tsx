import type { Snapshot } from "@verne/core";

interface HistoryPanelProps {
  title: string;
  snapshots: Snapshot[];
  selected: Snapshot | null;
  previewBody: string;
  onSelect: (snapshot: Snapshot) => void;
  onRestore: (snapshot: Snapshot) => void;
  onClose: () => void;
}

/**
 * Historial visible (P: "nunca pierdes nada"). Los snapshots ya existían en
 * disco; esta ventana los saca a la luz: ver cada versión y restaurar una.
 */
export function HistoryPanel({
  title,
  snapshots,
  selected,
  previewBody,
  onSelect,
  onRestore,
  onClose,
}: HistoryPanelProps) {
  return (
    <section className="history">
      <header className="export-header">
        <h2>Historial de “{title}”</h2>
        <button type="button" onClick={onClose}>
          ← Volver al documento
        </button>
      </header>

      {snapshots.length === 0 ? (
        <p className="placeholder">
          Aún no hay versiones guardadas de este documento. Verne respalda una copia la
          primera vez que editas en cada sesión: vuelve aquí después de escribir un rato.
        </p>
      ) : (
        <div className="history-layout">
          <ul className="history-list">
            {snapshots.map((s) => (
              <li key={s.path}>
                <button
                  type="button"
                  className={
                    selected?.path === s.path ? "history-item history-item--active" : "history-item"
                  }
                  onClick={() => onSelect(s)}
                >
                  <span className="history-when">{formatWhen(s.takenAt)}</span>
                  <span className="history-words">{s.words} palabras</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="history-preview">
            {selected ? (
              <>
                <div className="history-preview-head">
                  <span>{formatWhen(selected.takenAt)}</span>
                  <button type="button" onClick={() => onRestore(selected)}>
                    Restaurar esta versión
                  </button>
                </div>
                <pre className="history-body">{previewBody}</pre>
              </>
            ) : (
              <p className="placeholder">Elige una versión de la izquierda para verla.</p>
            )}
          </div>
        </div>
      )}

      <p className="quality-footnote">
        Las versiones viven en <code>.verne/history/</code>: son un extra prescindible —
        borrar esa carpeta nunca toca tu documento. Restaurar guarda antes la versión
        actual, así que siempre puedes deshacer una restauración.
      </p>
    </section>
  );
}

function formatWhen(iso: string | null): string {
  if (!iso) return "Versión guardada";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Versión guardada" : date.toLocaleString();
}
