import { open } from "@tauri-apps/plugin-dialog";
import {
  createProject,
  openProject,
  readProjectTree,
  VerneError,
  type BlueprintId,
  type Project,
  type TreeNode,
} from "@verne/core";
import { ProjectTree } from "@verne/ui";
import { useState } from "react";
import { tauriFs } from "./tauri-fs.js";

const BLUEPRINT_LABELS: Record<BlueprintId, string> = {
  blog: "Blog",
  cuento: "Cuentos",
};

export function App() {
  const [project, setProject] = useState<Project | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selected, setSelected] = useState<TreeNode | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [error, setError] = useState<string>("");

  async function loadProject(p: Project) {
    setProject(p);
    setTree(await readProjectTree(tauriFs, p));
    setSelected(null);
    setPreview("");
    setError("");
  }

  function reportError(e: unknown) {
    setError(e instanceof VerneError ? e.message : `Algo salió mal: ${String(e)}`);
  }

  async function handleOpen() {
    try {
      const dir = await open({ directory: true, title: "Abrir proyecto Verne" });
      if (typeof dir !== "string") return;
      await loadProject(await openProject(tauriFs, dir));
    } catch (e) {
      reportError(e);
    }
  }

  async function handleCreate(name: string, blueprint: BlueprintId) {
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
    setSelected(node);
    if (node.kind === "document") {
      setPreview(await tauriFs.readTextFile(node.path));
    }
  }

  if (!project) {
    return <Welcome onOpen={handleOpen} onCreate={handleCreate} error={error} />;
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <header className="sidebar-header">
          <h1 className="project-name">{project.manifest.name}</h1>
          <span className="badge">{BLUEPRINT_LABELS[project.manifest.blueprint]}</span>
        </header>
        <nav aria-label="Contenido del proyecto">
          <ProjectTree nodes={tree} selectedPath={selected?.path} onSelect={handleSelect} />
        </nav>
        <footer className="sidebar-footer">
          <button type="button" onClick={handleOpen}>
            Abrir otro proyecto…
          </button>
        </footer>
      </aside>
      <main className="main">
        {error && <p className="error">{error}</p>}
        {selected?.kind === "document" ? (
          <article className="preview">
            <p className="preview-note">
              Vista de solo lectura — el editor llega en el hito M1.
            </p>
            <pre>{preview}</pre>
          </article>
        ) : (
          <p className="placeholder">Selecciona un documento para verlo.</p>
        )}
      </main>
    </div>
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
