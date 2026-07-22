import { open } from "@tauri-apps/plugin-dialog";
import {
  CONTENT_DIR,
  countWords,
  createProject,
  joinPath,
  openProject,
  readDocument,
  readProjectTree,
  snapshotDocument,
  VerneError,
  writeDocument,
  type BlueprintId,
  type Project,
  type TreeNode,
} from "@verne/core";
import type { ProseEditorHandle } from "@verne/editor";
import { ProjectTree } from "@verne/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { MarkdownEditor } from "./MarkdownEditor.js";
import { tauriFs } from "./tauri-fs.js";

const BLUEPRINT_LABELS: Record<BlueprintId, string> = {
  blog: "Blog",
  cuento: "Cuentos",
};

const AUTOSAVE_DELAY_MS = 800;

interface OpenDoc {
  node: TreeNode;
  frontmatterRaw: string | null;
  body: string;
}

type SaveState = "saved" | "dirty" | "saving";

export function App() {
  const [project, setProject] = useState<Project | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [doc, setDoc] = useState<OpenDoc | null>(null);
  const [error, setError] = useState<string>("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [words, setWords] = useState(0);
  const [focusMode, setFocusMode] = useState(false);

  const editorRef = useRef<ProseEditorHandle | null>(null);
  const docRef = useRef<OpenDoc | null>(null);
  const projectRef = useRef<Project | null>(null);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Rutas ya respaldadas en esta sesión: un snapshot por doc y sesión. */
  const snapshottedRef = useRef(new Set<string>());

  docRef.current = doc;
  projectRef.current = project;

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
    } catch (e) {
      setSaveState("dirty");
      setError(`No se pudo guardar: ${String(e)}`);
    }
  }, []);

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

  async function refreshTree(p: Project) {
    setTree(await readProjectTree(tauriFs, p));
  }

  async function loadProject(p: Project) {
    await saveNow();
    setProject(p);
    await refreshTree(p);
    setDoc(null);
    setWords(0);
    setError("");
    snapshottedRef.current.clear();
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

  async function handleCreateProject(name: string, blueprint: BlueprintId) {
    try {
      const dir = await open({
        directory: true,
        title: "Elige una carpeta (vacía) para el proyecto",
      });
      if (typeof dir !== "string") return;
      await loadProject(await createProject(tauriFs, dir, { name, blueprint }));
    } catch (e) {
      reportError(e);
    }
  }

  async function handleSelect(node: TreeNode) {
    if (node.kind !== "document") return;
    try {
      await saveNow(); // nunca cambiar de documento con cambios sin escribir
      const parts = await readDocument(tauriFs, node.path);
      dirtyRef.current = false;
      setSaveState("saved");
      setDoc({ node, frontmatterRaw: parts.frontmatterRaw, body: parts.body });
      setWords(countWords(parts.body));
      setError("");
    } catch (e) {
      reportError(e);
    }
  }

  async function handleNewDocument(title: string) {
    const p = projectRef.current;
    if (!p) return;
    try {
      await saveNow();
      const slug = slugify(title) || "sin-titulo";
      let path = joinPath(p.dir, CONTENT_DIR, `${slug}.md`);
      for (let n = 2; await tauriFs.exists(path); n++) {
        path = joinPath(p.dir, CONTENT_DIR, `${slug}-${n}.md`);
      }
      await writeDocument(tauriFs, path, {
        frontmatterRaw: `---\ntitle: ${yamlString(title)}\nestado: borrador\n---\n`,
        body: "",
      });
      await refreshTree(p);
      const name = path.split("/").pop()?.replace(/\.md$/, "") ?? slug;
      await handleSelect({ name, path, kind: "document" });
    } catch (e) {
      reportError(e);
    }
  }

  if (!project) {
    return <Welcome onOpen={handleOpenProject} onCreate={handleCreateProject} error={error} />;
  }

  return (
    <div className={`workspace${focusMode ? " workspace--focus" : ""}`}>
      <aside className="sidebar">
        <header className="sidebar-header">
          <h1 className="project-name">{project.manifest.name}</h1>
          <span className="badge">{BLUEPRINT_LABELS[project.manifest.blueprint]}</span>
        </header>
        <NewDocumentForm onCreate={handleNewDocument} />
        <nav aria-label="Contenido del proyecto">
          <ProjectTree nodes={tree} selectedPath={doc?.node.path} onSelect={handleSelect} />
        </nav>
        <footer className="sidebar-footer">
          <button type="button" onClick={handleOpenProject}>
            Abrir otro proyecto…
          </button>
        </footer>
      </aside>
      <main className="main">
        {error && <p className="error">{error}</p>}
        {doc ? (
          <MarkdownEditor
            key={doc.node.path}
            initialBody={doc.body}
            onReady={(handle) => {
              editorRef.current = handle;
            }}
            onDocChanged={handleDocChanged}
          />
        ) : (
          <p className="placeholder">
            Selecciona un documento o crea uno nuevo para empezar a escribir.
          </p>
        )}
      </main>
      <footer className="statusbar">
        <span>{doc ? doc.node.name : "—"}</span>
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

function NewDocumentForm({ onCreate }: { onCreate: (title: string) => void }) {
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
        placeholder="Nuevo documento…"
        aria-label="Título del nuevo documento"
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
