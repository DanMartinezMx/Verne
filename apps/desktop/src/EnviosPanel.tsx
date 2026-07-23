import type { BlueprintDef } from "@verne/blueprints";
import type { CollectionEntry, DocumentMeta } from "@verne/core";
import { useState } from "react";

interface EnviosPanelProps {
  submissions: NonNullable<BlueprintDef["submissions"]>;
  entries: CollectionEntry[];
  docs: DocumentMeta[];
  onAdd: (fields: Record<string, unknown>) => void;
  onUpdate: (path: string, changes: Record<string, unknown>) => void;
}

/** Registro de envíos: la hoja de cálculo del cuentista, jubilada (RFC-0002 §2.2). */
export function EnviosPanel({ submissions, entries, docs, onAdd, onUpdate }: EnviosPanelProps) {
  const [cuento, setCuento] = useState("");
  const [mercado, setMercado] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

  const sorted = [...entries].sort((a, b) =>
    String(b.fields["fechaEnvio"] ?? "").localeCompare(String(a.fields["fechaEnvio"] ?? "")),
  );

  function titleFor(cuentoPath: unknown): string {
    const doc = docs.find((d) => d.path.endsWith(String(cuentoPath ?? "")));
    return doc?.title ?? String(cuentoPath ?? "—");
  }

  return (
    <section className="envios">
      <h2>Envíos</h2>
      <form
        className="envios-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!cuento || !mercado.trim()) return;
          onAdd({
            cuento,
            mercado: mercado.trim(),
            fechaEnvio: fecha,
            respuesta: "pendiente",
          });
          setMercado("");
        }}
      >
        <select value={cuento} onChange={(e) => setCuento(e.target.value)} aria-label="Cuento" required>
          <option value="" disabled>
            Elige un cuento…
          </option>
          {docs.map((d) => (
            <option key={d.path} value={relativePath(d)}>
              {d.title}
            </option>
          ))}
        </select>
        <input
          value={mercado}
          onChange={(e) => setMercado(e.target.value)}
          placeholder="Revista, concurso, antología…"
          aria-label="Mercado"
          required
        />
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          aria-label="Fecha de envío"
        />
        <button type="submit">Registrar envío</button>
      </form>

      {sorted.length === 0 ? (
        <p className="placeholder">
          Sin envíos todavía. Cuando mandes un cuento a una revista o a un concurso,
          regístralo aquí y olvídate de la hoja de cálculo.
        </p>
      ) : (
        <table className="envios-table">
          <thead>
            <tr>
              <th>Cuento</th>
              <th>Mercado</th>
              <th>Enviado</th>
              <th>Respuesta</th>
              <th>Respondido</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => (
              <tr key={entry.path}>
                <td>{titleFor(entry.fields["cuento"])}</td>
                <td>{String(entry.fields["mercado"] ?? "—")}</td>
                <td>{String(entry.fields["fechaEnvio"] ?? "—")}</td>
                <td>
                  <select
                    value={String(entry.fields["respuesta"] ?? "pendiente")}
                    aria-label="Respuesta"
                    onChange={(e) => {
                      const respuesta = e.target.value;
                      onUpdate(entry.path, {
                        respuesta,
                        fechaRespuesta:
                          respuesta === "pendiente"
                            ? undefined
                            : new Date().toISOString().slice(0, 10),
                      });
                    }}
                  >
                    {submissions.responses.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{String(entry.fields["fechaRespuesta"] ?? "—")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function relativePath(doc: DocumentMeta): string {
  const i = doc.path.indexOf("contenido/");
  return i >= 0 ? doc.path.slice(i) : doc.path;
}
