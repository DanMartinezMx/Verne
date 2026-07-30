import type { CollectionDef, CollectionFieldDef } from "@verne/blueprints";
import type { CollectionEntry, DocumentMeta } from "@verne/core";
import { useState } from "react";

interface CollectionPanelProps {
  collections: CollectionDef[];
  /** Fichas por nombre de colección. */
  entries: Record<string, CollectionEntry[]>;
  docs: DocumentMeta[];
  onAdd: (collection: string, fields: Record<string, unknown>) => void;
  onUpdate: (collection: string, path: string, changes: Record<string, unknown>) => void;
}

/**
 * Fichas con esquema de cualquier colección del espacio: envíos de un cuento,
 * personajes de una novela, localizaciones. Antes era `EnviosPanel`, cableado a
 * una colección concreta; la primitiva de core siempre fue genérica y ahora el
 * panel también (RFC-0003 §2).
 */
export function CollectionPanel(props: CollectionPanelProps) {
  const [activeName, setActiveName] = useState(props.collections[0]?.name ?? "");
  const active = props.collections.find((c) => c.name === activeName) ?? props.collections[0];
  if (!active) return null;

  const entries = props.entries[active.name] ?? [];

  return (
    <section className="collection">
      {props.collections.length > 1 && (
        <div className="collection-tabs" role="tablist">
          {props.collections.map((c) => (
            <button
              key={c.name}
              type="button"
              role="tab"
              aria-selected={c.name === active.name}
              className={c.name === active.name ? "tab tab--active" : "tab"}
              onClick={() => setActiveName(c.name)}
            >
              {c.label} ({(props.entries[c.name] ?? []).length})
            </button>
          ))}
        </div>
      )}

      <h2>{active.label}</h2>

      <NewEntryForm
        key={active.name}
        collection={active}
        docs={props.docs}
        onAdd={(fields) => props.onAdd(active.name, fields)}
      />

      {entries.length === 0 ? (
        <p className="placeholder">
          Sin fichas todavía. Rellena el formulario y aparecerán aquí — y como archivos
          Markdown en <code>colecciones/{active.name}/</code>.
        </p>
      ) : (
        <table className="collection-table">
          <thead>
            <tr>
              {active.fields.map((f) => (
                <th key={f.key}>{f.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortEntries(entries, active.fields).map((entry) => (
              <tr key={entry.path}>
                {active.fields.map((field) => (
                  <td key={field.key}>
                    <Cell
                      field={field}
                      value={entry.fields[field.key]}
                      docs={props.docs}
                      onChange={(changes) => props.onUpdate(active.name, entry.path, changes)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** Una celda: los enum se editan en el sitio; el resto se muestra. */
function Cell({
  field,
  value,
  docs,
  onChange,
}: {
  field: CollectionFieldDef;
  value: unknown;
  docs: DocumentMeta[];
  onChange: (changes: Record<string, unknown>) => void;
}) {
  if (field.type === "enum" && field.values) {
    const values = field.values;
    return (
      <select
        value={String(value ?? values[0])}
        aria-label={field.label}
        onChange={(e) => onChange(changeForEnum(field, values, e.target.value))}
      >
        {values.map((v) => (
          <option key={v} value={v}>
            {capitalize(v)}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "document") return <>{titleFor(docs, value)}</>;
  return <>{value === undefined || value === "" ? "—" : String(value)}</>;
}

/**
 * Al salir del primer valor del enum ("pendiente"), sella la fecha de hoy en el
 * campo que el espacio indique; al volver a él, la borra.
 */
function changeForEnum(
  field: CollectionFieldDef,
  values: string[],
  next: string,
): Record<string, unknown> {
  const changes: Record<string, unknown> = { [field.key]: next };
  if (field.stampDateField) {
    changes[field.stampDateField] = next === values[0] ? undefined : today();
  }
  return changes;
}

function NewEntryForm({
  collection,
  docs,
  onAdd,
}: {
  collection: CollectionDef;
  docs: DocumentMeta[];
  onAdd: (fields: Record<string, unknown>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(collection));

  // Los campos enum no se piden al crear: nacen en su primer valor.
  const asked = collection.fields.filter((f) => f.type !== "enum");

  function set(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      className="collection-form"
      onSubmit={(e) => {
        e.preventDefault();
        const fields: Record<string, unknown> = {};
        for (const field of collection.fields) {
          if (field.type === "enum" && field.values) {
            fields[field.key] = field.values[0];
          } else {
            const value = (values[field.key] ?? "").trim();
            if (value !== "") fields[field.key] = value;
          }
        }
        onAdd(fields);
        setValues(initialValues(collection));
      }}
    >
      {asked.map((field) =>
        field.type === "document" ? (
          <select
            key={field.key}
            value={values[field.key] ?? ""}
            aria-label={field.label}
            required
            onChange={(e) => set(field.key, e.target.value)}
          >
            <option value="" disabled>
              {field.label}…
            </option>
            {docs.map((d) => (
              <option key={d.path} value={relativePath(d)}>
                {d.title}
              </option>
            ))}
          </select>
        ) : (
          <input
            key={field.key}
            type={field.type === "date" ? "date" : "text"}
            value={values[field.key] ?? ""}
            aria-label={field.label}
            placeholder={field.label}
            required={field.type !== "date"}
            onChange={(e) => set(field.key, e.target.value)}
          />
        ),
      )}
      <button type="submit">Añadir</button>
    </form>
  );
}

/** Las fechas nacen con la de hoy; el resto en blanco. */
function initialValues(collection: CollectionDef): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of collection.fields) {
    if (field.type === "date") values[field.key] = today();
  }
  return values;
}

/** Más reciente primero, por el primer campo de fecha que declare la colección. */
function sortEntries(entries: CollectionEntry[], fields: CollectionFieldDef[]): CollectionEntry[] {
  const dateKey = fields.find((f) => f.type === "date")?.key;
  if (!dateKey) return entries;
  return [...entries].sort((a, b) =>
    String(b.fields[dateKey] ?? "").localeCompare(String(a.fields[dateKey] ?? "")),
  );
}

function titleFor(docs: DocumentMeta[], value: unknown): string {
  const raw = String(value ?? "");
  if (raw === "") return "—";
  return docs.find((d) => d.path.endsWith(raw))?.title ?? raw;
}

function relativePath(doc: DocumentMeta): string {
  const i = doc.path.indexOf("contenido/");
  return i >= 0 ? doc.path.slice(i) : doc.path;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
