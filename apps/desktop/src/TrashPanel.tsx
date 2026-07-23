import type { TrashEntry } from "@verne/core";

interface TrashPanelProps {
  entries: TrashEntry[];
  onRestore: (entry: TrashEntry) => void;
}

export function TrashPanel({ entries, onRestore }: TrashPanelProps) {
  return (
    <section className="trash">
      <h2>Papelera</h2>
      <p className="placeholder">
        Nada se destruye: estos archivos viven en la carpeta <code>papelera/</code> de tu
        proyecto y puedes verlos también desde el explorador.
      </p>
      {entries.length === 0 ? (
        <p className="placeholder">La papelera está vacía.</p>
      ) : (
        <ul className="trash-list">
          {entries.map((entry) => (
            <li key={entry.path}>
              <span className="trash-name">{entry.name}</span>
              <span className="trash-date">
                {entry.deletedAt ? new Date(entry.deletedAt).toLocaleString() : ""}
              </span>
              <button type="button" onClick={() => onRestore(entry)}>
                Restaurar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
