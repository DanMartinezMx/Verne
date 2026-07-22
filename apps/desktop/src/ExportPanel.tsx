import type { BlueprintDef } from "@verne/blueprints";
import { toCleanMarkdown, toHtmlDocument, toHtmlFragment, toManuscriptDocx } from "@verne/export";
import { useState } from "react";

interface ExportPanelProps {
  blueprint: BlueprintDef;
  title: string;
  body: string;
  author: string;
  language: string;
  onSaveAuthor: (author: string) => void;
  /** Devuelve true si el archivo se guardó (false = diálogo cancelado). */
  onSaveFile: (suggestedName: string, contents: string | Uint8Array) => Promise<boolean>;
  onClose: () => void;
}

/** Exportación del documento abierto, con opciones según el Blueprint (P6). */
export function ExportPanel(props: ExportPanelProps) {
  const [author, setAuthor] = useState(props.author);
  const [contact, setContact] = useState("");
  const [feedback, setFeedback] = useState("");

  function notify(message: string) {
    setFeedback(message);
    setTimeout(() => setFeedback(""), 2500);
  }

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify(`${label} copiado al portapapeles ✓`);
    } catch {
      notify("No se pudo copiar al portapapeles");
    }
  }

  async function saveFile(name: string, contents: string | Uint8Array) {
    if (await props.onSaveFile(name, contents)) notify("Archivo guardado ✓");
  }

  function commitAuthor() {
    const clean = author.trim();
    if (clean !== props.author) props.onSaveAuthor(clean);
  }

  const slug = props.title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return (
    <section className="export">
      <header className="export-header">
        <h2>Exportar “{props.title}”</h2>
        <button type="button" onClick={props.onClose}>
          ← Volver al documento
        </button>
      </header>
      {feedback && <p className="export-feedback" aria-live="polite">{feedback}</p>}

      {props.blueprint.id === "blog" ? (
        <>
          <div className="export-card">
            <h3>Para tu CMS</h3>
            <p className="export-note">
              HTML limpio del cuerpo, sin clases ni estilos: pégalo en WordPress, Ghost,
              o donde publiques.
            </p>
            <div className="export-actions">
              <button
                type="button"
                onClick={() =>
                  void copyText("HTML", toHtmlFragment({ title: props.title, body: props.body }))
                }
              >
                Copiar HTML
              </button>
              <button
                type="button"
                onClick={() => void copyText("Markdown", toCleanMarkdown(props.body))}
              >
                Copiar Markdown
              </button>
            </div>
          </div>
          <div className="export-card">
            <h3>Como archivo</h3>
            <div className="export-actions">
              <button
                type="button"
                onClick={() =>
                  void saveFile(
                    `${slug || "entrada"}.html`,
                    toHtmlDocument({
                      title: props.title,
                      body: props.body,
                      language: props.language,
                    }),
                  )
                }
              >
                Guardar HTML…
              </button>
              <button
                type="button"
                onClick={() =>
                  void saveFile(`${slug || "entrada"}.md`, toCleanMarkdown(props.body))
                }
              >
                Guardar Markdown…
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="export-card">
          <h3>Manuscrito estándar (DOCX)</h3>
          <p className="export-note">
            El formato que esperan revistas y concursos: Times 12, doble espacio,
            encabezado con apellido y página, separadores “#” y “Fin” al cierre.
          </p>
          <label className="export-field">
            Autor
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              onBlur={commitAuthor}
              placeholder="Tu nombre (se guarda en el proyecto)"
            />
          </label>
          <label className="export-field">
            Contacto (opcional, una línea por dato)
            <textarea
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              rows={2}
              placeholder={"correo@ejemplo.mx\nCiudad, País"}
            />
          </label>
          <div className="export-actions">
            <button
              type="button"
              onClick={() =>
                void (async () => {
                  const bytes = await toManuscriptDocx({
                    title: props.title,
                    body: props.body,
                    ...(author.trim() !== "" ? { author: author.trim() } : {}),
                    contact: contact.split("\n"),
                  });
                  await saveFile(`${slug || "cuento"}.docx`, bytes);
                })()
              }
            >
              Guardar DOCX…
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
