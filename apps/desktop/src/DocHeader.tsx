import type { MetaFieldDef, WorkflowState } from "@verne/blueprints";
import { useEffect, useState } from "react";

interface DocHeaderProps {
  title: string;
  estado: string | null;
  states: WorkflowState[];
  /** Campos propios del espacio, además de título y estado. */
  metaFields: MetaFieldDef[];
  /** Frontmatter del documento abierto, para poblar esos campos. */
  fields: Record<string, unknown>;
  /** Valores admitidos por campo, tomados del proyecto (`verne.yaml`). */
  options: Record<string, string[]>;
  onChangeTitle: (title: string) => void;
  onChangeEstado: (estado: string) => void;
  onChangeField: (key: string, value: unknown) => void;
  /** Cambia la lista de valores admitidos de un campo, en el proyecto. */
  onChangeOptions: (key: string, options: string[]) => void;
  onExport: () => void;
  onQuality: () => void;
  onHistory: () => void;
  onTrash: () => void;
}

/**
 * Metadatos del documento abierto. Título y estado son fijos (los necesita toda
 * la app); el resto lo declara el espacio en `metaFields`, que es lo que permite
 * al blog editar su `description` y su `image` sin código propio (RFC-0003 §5).
 */
export function DocHeader(props: DocHeaderProps) {
  const [title, setTitle] = useState(props.title);

  useEffect(() => {
    setTitle(props.title);
  }, [props.title]);

  const currentState = props.states.find((s) => s.id === props.estado);

  function commitTitle() {
    const clean = title.trim();
    if (clean !== "" && clean !== props.title) props.onChangeTitle(clean);
    else setTitle(props.title);
  }

  return (
    <div className="doc-header">
      <div className="doc-header-main">
        <input
          className="doc-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          aria-label="Título del documento"
        />
        <span
          className="state-dot"
          aria-hidden="true"
          style={{ backgroundColor: currentState?.color ?? "transparent" }}
        />
        <select
          className="doc-estado"
          aria-label="Estado del documento"
          value={props.estado ?? ""}
          onChange={(e) => props.onChangeEstado(e.target.value)}
        >
          {!currentState && <option value="">Sin estado</option>}
          {props.states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="button" className="doc-export" onClick={props.onQuality}>
          Calidad
        </button>
        <button type="button" className="doc-export" onClick={props.onHistory}>
          Historial
        </button>
        <button type="button" className="doc-export" onClick={props.onExport}>
          Exportar
        </button>
        <button
          type="button"
          className="doc-trash"
          title="Mover a la papelera"
          aria-label="Mover a la papelera"
          onClick={props.onTrash}
        >
          🗑
        </button>
      </div>

      {props.metaFields.length > 0 && (
        <div className="doc-meta">
          {props.metaFields.map((field) => (
            <MetaField
              key={field.key}
              field={field}
              value={props.fields[field.key]}
              options={props.options[field.key]}
              onChange={(value) => props.onChangeField(field.key, value)}
              onChangeOptions={props.onChangeOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Un campo declarado. Los que se derivan del estado se muestran pero no se
 * editan: quien los manda es el estado del documento.
 */
function MetaField({
  field,
  value,
  options,
  onChange,
  onChangeOptions,
}: {
  field: MetaFieldDef;
  value: unknown;
  /** Valores admitidos, ya resueltos del proyecto (no del código). */
  options: string[] | undefined;
  onChange: (value: unknown) => void;
  onChangeOptions: (key: string, options: string[]) => void;
}) {
  const [text, setText] = useState(() => toText(field, value));

  // Re-sincroniza al cambiar de documento, o cuando el valor cambia por fuera
  // (una derivación del estado, por ejemplo).
  useEffect(() => {
    setText(toText(field, value));
  }, [field, value]);

  if (field.derivedFromState) {
    return (
      <label className="doc-meta-field doc-meta-field--derived">
        <span>{field.label}</span>
        <output title="Lo decide el estado del documento">{value === true ? "sí" : "no"}</output>
      </label>
    );
  }

  if (field.type === "boolean") {
    return (
      <label className="doc-meta-field doc-meta-field--check">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{field.label}</span>
      </label>
    );
  }

  // Lista de opciones cerradas: se marca, no se escribe. Así no existe el valor
  // mal escrito que rompe el build de un sitio que valida sus categorías.
  if (field.type === "list" && options) {
    return (
      <OptionsField
        field={field}
        options={options}
        selected={Array.isArray(value) ? value.map(String) : []}
        onChange={onChange}
        onChangeOptions={onChangeOptions}
      />
    );
  }

  const commit = () => {
    const next = fromText(field, text);
    if (!sameValue(next, value)) onChange(next);
  };

  return (
    <label className="doc-meta-field">
      <span>{field.label}</span>
      {field.type === "textarea" ? (
        <textarea
          value={text}
          rows={2}
          placeholder={field.placeholder}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
        />
      ) : (
        <input
          type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
          value={text}
          placeholder={field.placeholder ?? (field.type === "list" ? "una, dos, tres" : undefined)}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      )}
    </label>
  );
}

/**
 * Campo de lista cerrada: se marcan opciones. La lista es del proyecto (vive en
 * su `verne.yaml`), así que se puede añadir y quitar desde aquí — las categorías
 * del blog de una persona no son las de otra.
 */
function OptionsField({
  field,
  options,
  selected,
  onChange,
  onChangeOptions,
}: {
  field: MetaFieldDef;
  options: string[];
  selected: string[];
  onChange: (value: unknown) => void;
  onChangeOptions: (key: string, options: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [fresh, setFresh] = useState("");

  function toggle(option: string) {
    const next = selected.includes(option)
      ? selected.filter((v) => v !== option)
      : [...selected, option];
    onChange(next.length > 0 ? next : undefined);
  }

  function add() {
    const clean = fresh.trim();
    setFresh("");
    if (clean === "" || options.includes(clean)) return;
    onChangeOptions(field.key, [...options, clean]);
    onChange([...selected, clean]);
  }

  /** Quitar del proyecto también lo quita de este documento. */
  function removeOption(option: string) {
    onChangeOptions(
      field.key,
      options.filter((o) => o !== option),
    );
    if (selected.includes(option)) {
      const next = selected.filter((v) => v !== option);
      onChange(next.length > 0 ? next : undefined);
    }
  }

  return (
    <div className="doc-meta-field doc-meta-field--options">
      <span>
        {field.label}
        <button
          type="button"
          className="linklike doc-meta-edit"
          aria-pressed={editing}
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "listo" : "editar lista"}
        </button>
      </span>
      <div className="doc-meta-options" role="group" aria-label={field.label}>
        {options.map((option) => (
          <span key={option} className="doc-meta-option">
            <button
              type="button"
              className={selected.includes(option) ? "chip chip--active" : "chip"}
              aria-pressed={selected.includes(option)}
              onClick={() => toggle(option)}
            >
              {option}
            </button>
            {editing && (
              <button
                type="button"
                className="doc-meta-option-remove"
                title={`Quitar “${option}” de la lista del proyecto`}
                aria-label={`Quitar ${option} de la lista`}
                onClick={() => removeOption(option)}
              >
                ×
              </button>
            )}
          </span>
        ))}
        {editing && (
          <span className="doc-meta-option-add">
            <input
              value={fresh}
              placeholder="Nueva…"
              aria-label={`Añadir a ${field.label}`}
              onChange={(e) => setFresh(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <button type="button" onClick={add} title="Añadir a la lista">
              ＋
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

/** Valor del frontmatter → texto del control. */
function toText(field: MetaFieldDef, value: unknown): string {
  if (value === undefined || value === null) return "";
  if (field.type === "list") {
    return Array.isArray(value) ? value.map(String).join(", ") : String(value);
  }
  // Un `<input type="date">` solo acepta YYYY-MM-DD; el frontmatter guarda ISO
  // completo (lo que espera el sitio del blog), así que se recorta al mostrar.
  if (field.type === "date") return String(value).slice(0, 10);
  return String(value);
}

/** Texto del control → valor del frontmatter. Vacío borra el campo. */
function fromText(field: MetaFieldDef, text: string): unknown {
  const clean = text.trim();
  if (field.type === "list") {
    const items = clean
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t !== "");
    return items.length > 0 ? items : undefined;
  }
  if (clean === "") return undefined;
  if (field.type === "number") {
    const parsed = Number(clean);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (field.type === "date") {
    // Se escribe ISO completo para mantener el formato que el destino espera.
    const parsed = new Date(`${clean}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? clean : parsed.toISOString();
  }
  return clean;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return a.join(" ") === b.join(" ");
  if (a === undefined && (b === undefined || b === null || b === "")) return true;
  return a === b;
}
