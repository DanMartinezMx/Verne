import { open, save } from "@tauri-apps/plugin-dialog";
import { getBlueprint, type BlueprintDef } from "@verne/blueprints";
import {
  addCollectionEntry,
  CONTENT_DIR,
  EXPORT_DIR,
  countWords,
  createProject,
  joinPath,
  listCollection,
  listTrash,
  openProject,
  readDocument,
  readDocumentMeta,
  readProjectDocuments,
  readProjectTree,
  restoreDocument,
  searchProject,
  snapshotDocument,
  trashDocument,
  updateCollectionEntry,
  updateProjectManifest,
  VerneError,
  withFrontmatterFields,
  writeDocument,
  type BlueprintId,
  type CollectionEntry,
  type DocumentMeta,
  type Project,
  type SearchResult,
  type TrashEntry,
  type TreeNode,
} from "@verne/core";
import type { FormatState, ProseEditorHandle } from "@verne/editor";
import { ProjectTree, type TreeDecoration } from "@verne/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { DocHeader } from "./DocHeader.js";
import { EnviosPanel } from "./EnviosPanel.js";
import { ExportPanel } from "./ExportPanel.js";
import { MarkdownEditor } from "./MarkdownEditor.js";
import { Toolbar } from "./Toolbar.js";
import { TrashPanel } from "./TrashPanel.js";
import { tauriFs } from "./tauri-fs.js";

const AUTOSAVE_DELAY_MS = 800;

interface OpenDoc {
  node: TreeNode;
  frontmatterRaw: string | null;
  body: string;
}

type SaveState = "saved" | "dirty" | "saving";
type View = "doc" | "envios" | "papelera" | "exportar";

export function App() {
  const [project, setProject] = useState<Project | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [docsMeta, setDocsMeta] = useState<DocumentMeta[]>([]);
  const [doc, setDoc] = useState<OpenDoc | null>(null);
  const [view, setView] = useState<View>("doc");
  const [envios, setEnvios] = useState<CollectionEntry[]>([]);
  const [trashEntries, setTrashEntries] = useState<TrashEntry[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportBody, setExportBody] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [words, setWords] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [formatState, setFormatState] = useState<FormatState | null>(null);

  const editorRef = useRef<ProseEditorHandle | null>(null);
  const docRef = useRef<OpenDoc | null>(null);
  const projectRef = useRef<Project | null>(null);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Rutas ya respaldadas en esta sesión: un snapshot por doc y sesión. */
  const snapshottedRef = useRef(new Set<string>());

  docRef.current = doc;
  projectRef.current = project;

  const blueprint: BlueprintDef | null = project ? getBlueprint(project.manifest.blueprint) : null;

  // ── Guardado ──────────────────────────────────────────────────────────

  const refreshDocMeta = useCallback(async (path: string, name: string) => {
    const meta = await readDocumentMeta(tauriFs, path, name);
    setDocsMeta((prev) => {
      const rest = prev.filter((m) => m.path !== path);
      return [...rest, meta];
    });
  }, []);

  const saveNow = useCallback(async () => {
    const current = docRef.current;
    const currentProject = projectRef.current;
    const editor = editorRef.current;
    if (!current || !currentProject || !editor || !dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState("saving");
    try {
      const body = editor.getMarkdown();
      if (!snapshottedRef.current.has(current.node.path)) {
        await snapshotDocument(tauriFs, currentProject, current.node.path);
        snapshottedRef.current.add(current.node.path);
      }
      await writeDocument(tauriFs, current.node.path, {
        frontmatterRaw: current.frontmatterRaw,
        body,
      });
      dirtyRef.current = false;
      setSaveState("saved");
      setWords(countWords(body));
      await refreshDocMeta(current.node.path, current.node.name);
    } catch (e) {
      setSaveState("dirty");
      setError(`No se pudo guardar: ${String(e)}`);
    }
  }, [refreshDocMeta]);

  const handleDocChanged = useCallback(() => {
    dirtyRef.current = true;
    setSaveState("dirty");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void saveNow(), AUTOSAVE_DELAY_MS);
  }, [saveNow]);

  // Atajos globales y guardado al perder el foco de la ventana.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveNow();
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFocusMode((f) => !f);
      } else if (e.key === "Escape") {
        setFocusMode(false);
      }
    }
    function onBlur() {
      void saveNow();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
    };
  }, [saveNow]);

  // ── Carga de proyecto y datos ─────────────────────────────────────────

  async function refreshProjectData(p: Project) {
    setTree(await readProjectTree(tauriFs, p));
    setDocsMeta(await readProjectDocuments(tauriFs, p));
    setTrashEntries(await listTrash(tauriFs, p));
    const bp = getBlueprint(p.manifest.blueprint);
    setEnvios(bp.submissions ? await listCollection(tauriFs, p, bp.submissions.collection) : []);
  }

  async function loadProject(p: Project) {
    await saveNow();
    setProject(p);
    setDoc(null);
    setView("doc");
    setFormatState(null);
    setSearchResults(null);
    setSearchQuery("");
    setEstadoFilter(null);
    setWords(0);
    setError("");
    snapshottedRef.current.clear();
    await refreshProjectData(p);
  }

  function reportError(e: unknown) {
    setError(e instanceof VerneError ? e.message : `Algo salió mal: ${String(e)}`);
  }

  async function handleOpenProject() {
    try {
      const dir = await open({ directory: true, title: "Abrir proyecto Verne" });
      if (typeof dir !== "string") return;
      await loadProject(await openProject(tauriFs, dir));
    } catch (e) {
      reportError(e);
    }
  }

  async function handleCreateProject(name: string, blueprintId: BlueprintId) {
    try {
      const dir = await open({
        directory: true,
        title: "Elige una carpeta (vacía) para el proyecto",
      });
      if (typeof dir !== "string") return;
      const bp = getBlueprint(blueprintId);
      await loadProject(
        await createProject(tauriFs, dir, {
          name,
          blueprint: blueprintId,
          starterDocument: bp.starterDocument,
        }),
      );
    } catch (e) {
      reportError(e);
    }
  }

  // ── Documentos ────────────────────────────────────────────────────────

  async function handleSelect(node: TreeNode) {
    if (node.kind !== "document") return;
    try {
      await saveNow(); // nunca cambiar de documento con cambios sin escribir
      const parts = await readDocument(tauriFs, node.path);
      dirtyRef.current = false;
      setSaveState("saved");
      setDoc({ node, frontmatterRaw: parts.frontmatterRaw, body: parts.body });
      setWords(countWords(parts.body));
      setView("doc");
      setError("");
    } catch (e) {
      reportError(e);
    }
  }

  async function handleNewDocument(title: string) {
    const p = projectRef.current;
    if (!p || !blueprint) return;
    try {
      await saveNow();
      const slug = slugify(title) || "sin-titulo";
      let path = joinPath(p.dir, CONTENT_DIR, `${slug}.md`);
      for (let n = 2; await tauriFs.exists(path); n++) {
        path = joinPath(p.dir, CONTENT_DIR, `${slug}-${n}.md`);
      }
      await writeDocument(tauriFs, path, {
        frontmatterRaw: `---\ntitle: ${yamlString(title)}\nestado: ${blueprint.initialState}\n---\n`,
        body: "",
      });
      setTree(await readProjectTree(tauriFs, p));
      const name = path.split("/").pop()?.replace(/\.md$/, "") ?? slug;
      await refreshDocMeta(path, name);
      await handleSelect({ name, path, kind: "document" });
    } catch (e) {
      reportError(e);
    }
  }

  /** Cambia metadatos del doc abierto reescribiendo solo el frontmatter. */
  async function updateDocMetadata(changes: Record<string, unknown>) {
    const current = docRef.current;
    if (!current) return;
    try {
      await saveNow();
      const parts = await readDocument(tauriFs, current.node.path);
      const updated = withFrontmatterFields(parts, changes);
      await writeDocument(tauriFs, current.node.path, updated);
      setDoc({ ...current, frontmatterRaw: updated.frontmatterRaw });
      await refreshDocMeta(current.node.path, current.node.name);
    } catch (e) {
      reportError(e);
    }
  }

  async function handleTrash() {
    const current = docRef.current;
    const p = projectRef.current;
    if (!current || !p) return;
    try {
      dirtyRef.current = false; // el documento se va: no re-escribirlo
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      await trashDocument(tauriFs, p, current.node.path);
      setDoc(null);
      setDocsMeta((prev) => prev.filter((m) => m.path !== current.node.path));
      setTree(await readProjectTree(tauriFs, p));
      setTrashEntries(await listTrash(tauriFs, p));
    } catch (e) {
      reportError(e);
    }
  }

  async function handleRestore(entry: TrashEntry) {
    const p = projectRef.current;
    if (!p) return;
    try {
      const restored = await restoreDocument(tauriFs, p, entry.path);
      setTree(await readProjectTree(tauriFs, p));
      setTrashEntries(await listTrash(tauriFs, p));
      const name = restored.split("/").pop()?.replace(/\.md$/, "") ?? entry.name;
      await refreshDocMeta(restored, name);
    } catch (e) {
      reportError(e);
    }
  }

  // ── Búsqueda y envíos ─────────────────────────────────────────────────

  async function handleSearch(query: string) {
    const p = projectRef.current;
    if (!p) return;
    if (query.trim() === "") {
      setSearchResults(null);
      return;
    }
    setSearchResults(await searchProject(tauriFs, p, query));
  }

  async function handleAddEnvio(fields: Record<string, unknown>) {
    const p = projectRef.current;
    if (!p || !blueprint?.submissions) return;
    try {
      const slug = slugify(`${String(fields["cuento"] ?? "")}-${String(fields["mercado"] ?? "")}`);
      await addCollectionEntry(
        tauriFs,
        p,
        blueprint.submissions.collection,
        slug || "envio",
        fields,
      );
      setEnvios(await listCollection(tauriFs, p, blueprint.submissions.collection));
    } catch (e) {
      reportError(e);
    }
  }

  async function handleUpdateEnvio(path: string, changes: Record<string, unknown>) {
    const p = projectRef.current;
    if (!p || !blueprint?.submissions) return;
    try {
      await updateCollectionEntry(tauriFs, path, changes);
      setEnvios(await listCollection(tauriFs, p, blueprint.submissions.collection));
    } catch (e) {
      reportError(e);
    }
  }

  async function switchView(v: View) {
    await saveNow();
    setView(v);
  }

  // ── Exportación ───────────────────────────────────────────────────────

  async function handleOpenExport() {
    const current = docRef.current;
    if (!current) return;
    try {
      await saveNow();
      const parts = await readDocument(tauriFs, current.node.path);
      setExportBody(parts.body);
      setView("exportar");
    } catch (e) {
      reportError(e);
    }
  }

  async function handleSaveAuthor(author: string) {
    const p = projectRef.current;
    if (!p) return;
    try {
      setProject(await updateProjectManifest(tauriFs, p, { author }));
    } catch (e) {
      reportError(e);
    }
  }

  async function handleSaveExportFile(
    suggestedName: string,
    contents: string | Uint8Array,
  ): Promise<boolean> {
    const p = projectRef.current;
    if (!p) return false;
    try {
      const extension = suggestedName.split(".").pop() ?? "txt";
      const target = await save({
        defaultPath: joinPath(p.dir, EXPORT_DIR, suggestedName),
        filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
      });
      if (typeof target !== "string") return false;
      if (typeof contents === "string") {
        await tauriFs.writeTextFile(target, contents);
      } else {
        await tauriFs.writeBinaryFile(target, contents);
      }
      return true;
    } catch (e) {
      reportError(e);
      return false;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (!project || !blueprint) {
    return <Welcome onOpen={handleOpenProject} onCreate={handleCreateProject} error={error} />;
  }

  const metaByPath = new Map(docsMeta.map((m) => [m.path, m]));
  const currentMeta = doc ? metaByPath.get(doc.node.path) : undefined;
  const decorations: Record<string, TreeDecoration> = {};
  for (const meta of docsMeta) {
    const state = blueprint.states.find((s) => s.id === meta.estado);
    decorations[meta.path] = {
      ...(state ? { dotColor: state.color } : {}),
      hint: `${state?.label ?? "Sin estado"} · ${meta.words} palabras`,
    };
  }

  const filteredDocs =
    estadoFilter === null ? null : docsMeta.filter((m) => m.estado === estadoFilter);

  return (
    <div className={`workspace${focusMode ? " workspace--focus" : ""}`}>
      <aside className="sidebar">
        <header className="sidebar-header">
          <h1 className="project-name">{project.manifest.name}</h1>
          <span className="badge">{blueprint.label}</span>
        </header>

        {blueprint.submissions && (
          <div className="view-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={view !== "envios"}
              className={view !== "envios" ? "tab tab--active" : "tab"}
              onClick={() => void switchView("doc")}
            >
              {blueprint.vocabulary.documentPlural}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "envios"}
              className={view === "envios" ? "tab tab--active" : "tab"}
              onClick={() => void switchView("envios")}
            >
              Envíos
            </button>
          </div>
        )}

        <NewDocumentForm
          placeholder={blueprint.vocabulary.newDocumentPlaceholder}
          onCreate={handleNewDocument}
        />

        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSearch(searchQuery);
          }}
        >
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value === "") setSearchResults(null);
            }}
            placeholder="Buscar en el proyecto…"
            aria-label="Buscar en el proyecto"
          />
        </form>

        {searchResults === null && (
          <div className="state-chips" role="group" aria-label="Filtrar por estado">
            <button
              type="button"
              className={estadoFilter === null ? "chip chip--active" : "chip"}
              onClick={() => setEstadoFilter(null)}
            >
              Todos
            </button>
            {blueprint.states.map((s) => {
              const count = docsMeta.filter((m) => m.estado === s.id).length;
              if (count === 0 && estadoFilter !== s.id) return null;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={estadoFilter === s.id ? "chip chip--active" : "chip"}
                  onClick={() => setEstadoFilter(estadoFilter === s.id ? null : s.id)}
                >
                  <span className="state-dot" style={{ backgroundColor: s.color }} />
                  {s.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        <nav aria-label="Contenido del proyecto" className="sidebar-content">
          {searchResults !== null ? (
            <SearchResultsList results={searchResults} onSelect={handleSelect} />
          ) : filteredDocs !== null ? (
            <DocList docs={filteredDocs} selectedPath={doc?.node.path} onSelect={handleSelect} />
          ) : (
            <ProjectTree
              nodes={tree}
              selectedPath={doc?.node.path}
              onSelect={handleSelect}
              decorations={decorations}
            />
          )}
        </nav>

        <footer className="sidebar-footer">
          <button type="button" className="linklike" onClick={() => void switchView("papelera")}>
            Papelera ({trashEntries.length})
          </button>
          <button type="button" onClick={handleOpenProject}>
            Abrir otro proyecto…
          </button>
        </footer>
      </aside>

      <main className="main">
        {error && <p className="error">{error}</p>}
        {view === "envios" && blueprint.submissions ? (
          <EnviosPanel
            submissions={blueprint.submissions}
            entries={envios}
            docs={docsMeta}
            onAdd={(fields) => void handleAddEnvio(fields)}
            onUpdate={(path, changes) => void handleUpdateEnvio(path, changes)}
          />
        ) : view === "papelera" ? (
          <TrashPanel entries={trashEntries} onRestore={(entry) => void handleRestore(entry)} />
        ) : view === "exportar" && doc ? (
          <ExportPanel
            blueprint={blueprint}
            title={currentMeta?.title ?? doc.node.name}
            body={exportBody}
            author={project.manifest.author ?? ""}
            language={project.manifest.language}
            onSaveAuthor={(author) => void handleSaveAuthor(author)}
            onSaveFile={handleSaveExportFile}
            onClose={() => setView("doc")}
          />
        ) : doc ? (
          <>
            <Toolbar
              state={formatState}
              onCommand={(name, payload) => editorRef.current?.exec(name, payload)}
            />
            <DocHeader
              title={currentMeta?.title ?? doc.node.name}
              estado={currentMeta?.estado ?? null}
              tags={currentMeta?.tags ?? []}
              states={blueprint.states}
              onChangeTitle={(title) => void updateDocMetadata({ title })}
              onChangeEstado={(estado) => void updateDocMetadata({ estado })}
              onChangeTags={(tags) =>
                void updateDocMetadata({ tags: tags.length > 0 ? tags : undefined })
              }
              onExport={() => void handleOpenExport()}
              onTrash={() => void handleTrash()}
            />
            <MarkdownEditor
              key={doc.node.path}
              initialBody={doc.body}
              onReady={(handle) => {
                editorRef.current = handle;
              }}
              onDocChanged={handleDocChanged}
              onFormatStateChanged={setFormatState}
            />
          </>
        ) : (
          <p className="placeholder">
            Selecciona un documento o crea uno nuevo para empezar a escribir.
          </p>
        )}
      </main>

      <footer className="statusbar">
        <span>{view === "doc" && doc ? (currentMeta?.title ?? doc.node.name) : "—"}</span>
        <span className="statusbar-right">
          <span>{words} palabras</span>
          <span aria-live="polite">
            {saveState === "saved" ? "Guardado" : saveState === "saving" ? "Guardando…" : "Sin guardar"}
          </span>
          <button
            type="button"
            className="linklike"
            onClick={() => setFocusMode((f) => !f)}
            title="Ctrl+Shift+F"
          >
            {focusMode ? "Salir de enfoque" : "Modo enfoque"}
          </button>
        </span>
      </footer>
    </div>
  );
}

function DocList({
  docs,
  selectedPath,
  onSelect,
}: {
  docs: DocumentMeta[];
  selectedPath?: string | undefined;
  onSelect: (node: TreeNode) => void;
}) {
  if (docs.length === 0) {
    return <p className="tree-empty">Ningún documento con este estado.</p>;
  }
  return (
    <ul className="tree">
      {docs.map((m) => (
        <li key={m.path}>
          <button
            type="button"
            className={`tree-item tree-item--document${
              m.path === selectedPath ? " tree-item--selected" : ""
            }`}
            onClick={() => onSelect({ name: m.name, path: m.path, kind: "document" })}
          >
            <span aria-hidden="true" className="tree-item-icon">
              📄
            </span>
            <span className="tree-item-name">{m.title}</span>
            <span className="tree-item-words">{m.words}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function SearchResultsList({
  results,
  onSelect,
}: {
  results: SearchResult[];
  onSelect: (node: TreeNode) => void;
}) {
  if (results.length === 0) {
    return <p className="tree-empty">Sin resultados.</p>;
  }
  return (
    <ul className="search-results">
      {results.map((r) => (
        <li key={r.path}>
          <button
            type="button"
            className="search-result"
            onClick={() => onSelect({ name: r.name, path: r.path, kind: "document" })}
          >
            <span className="search-result-title">{r.title}</span>
            <span className="search-result-snippet">{r.snippet}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function NewDocumentForm({
  placeholder,
  onCreate,
}: {
  placeholder: string;
  onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState("");
  return (
    <form
      className="new-doc"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) {
          onCreate(title.trim());
          setTitle("");
        }
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <button type="submit" title="Crear documento">
        +
      </button>
    </form>
  );
}

function Welcome({
  onOpen,
  onCreate,
  error,
}: {
  onOpen: () => void;
  onCreate: (name: string, blueprint: BlueprintId) => void;
  error: string;
}) {
  const [name, setName] = useState("");
  const [blueprint, setBlueprint] = useState<BlueprintId>("blog");

  return (
    <main className="welcome">
      <h1>Verne</h1>
      <p className="tagline">Tus palabras, en tus archivos.</p>
      {error && <p className="error">{error}</p>}
      <section className="card">
        <h2>Crear un proyecto</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onCreate(name.trim(), blueprint);
          }}
        >
          <label>
            Nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mi blog"
              required
            />
          </label>
          <label>
            Tipo de proyecto
            <select
              value={blueprint}
              onChange={(e) => setBlueprint(e.target.value as BlueprintId)}
            >
              <option value="blog">Blog</option>
              <option value="cuento">Cuentos</option>
            </select>
          </label>
          <button type="submit">Elegir carpeta y crear</button>
        </form>
      </section>
      <section className="card">
        <h2>Abrir un proyecto existente</h2>
        <button type="button" onClick={onOpen}>
          Abrir carpeta…
        </button>
      </section>
    </main>
  );
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Escapa un valor para frontmatter YAML de forma segura y legible. */
function yamlString(value: string): string {
  return /^[\w áéíóúüñÁÉÍÓÚÜÑ.,;-]+$/.test(value) && !/^[\s-]/.test(value)
    ? value
    : JSON.stringify(value);
}
