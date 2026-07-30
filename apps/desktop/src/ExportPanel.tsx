import type { BlueprintDef } from "@verne/blueprints";
import { joinDocument } from "@verne/core";
import { toCleanMarkdown, toHtmlDocument, toHtmlFragment, toManuscriptDocx } from "@verne/export";
import { useState } from "react";

interface ExportPanelProps {
  blueprint: BlueprintDef;
  title: string;
  body: string;
  /** Frontmatter del documento, para el `.md` que se copia al sitio. */
  frontmatterRaw: string | null;
  author: string;
  language: string;
  onSaveAuthor: (author: string) => void;
  /** Devuelve true si el archivo se guardó (false = diálogo cancelado). */
  onSaveFile: (suggestedName: string, contents: string | Uint8Array) => Promise<boolean>;
  onClose: () => void;
}

/**
 * Exportación del documento abierto. Lo que se ofrece sale de
 * `blueprint.exportProfiles` (RFC-0003 §2): antes lo decidía un
 * `if (blueprint.id === "blog")` aquí dentro.
 */
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

  const slug =
    props.title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || props.blueprint.vocabulary.documentSingular;

  return (
    <section className="export">
      <header className="export-header">
        <h2>Exportar “{props.title}”</h2>
        <button type="button" onClick={props.onClose}>
          ← Volver al documento
        </button>
      </header>
      {feedback && (
        <p className="export-feedback" aria-live="polite">
          {feedback}
        </p>
      )}

      {props.blueprint.exportProfiles.includes("cms") && (
        <>
          <div className="export-card">
            <h3>Para tu sitio</h3>
            <p className="export-note">
              El archivo Markdown con su frontmatter tal cual: cópialo al repositorio de tu
              sitio y compila sin retocar nada.
            </p>
            <div className="export-actions">
              <button
                type="button"
                onClick={() =>
                  void saveFile(
                    `${slug}.md`,
                    joinDocument({ frontmatterRaw: props.frontmatterRaw, body: props.body }),
                  )
                }
              >
                Guardar .md con frontmatter…
              </button>
              <button
                type="button"
                onClick={() =>
                  void copyText(
                    "Markdown",
                    joinDocument({ frontmatterRaw: props.frontmatterRaw, body: props.body }),
                  )
                }
              >
                Copiar .md con frontmatter
              </button>
            </div>
          </div>
          <div className="export-card">
            <h3>Para pegar en un CMS</h3>
            <p className="export-note">
              HTML o Markdown limpios del cuerpo, sin frontmatter ni clases: para WordPress,
              Ghost, o donde publiques pegando.
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
              <button
                type="button"
                onClick={() =>
                  void saveFile(
                    `${slug}.html`,
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
            </div>
          </div>
        </>
      )}

      {props.blueprint.exportProfiles.includes("manuscrito-docx") && (
        <div className="export-card">
          <h3>Manuscrito estándar (DOCX)</h3>
          <p className="export-note">
            El formato que esperan revistas y concursos: Times 12, doble espacio, encabezado
            con apellido y página, separadores “#” y “Fin” al cierre.
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
                  await saveFile(`${slug}.docx`, bytes);
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
