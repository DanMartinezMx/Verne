import {
  collectionSchemaYaml,
  getBlueprint,
  listBlueprints,
  type BlueprintDef,
} from "@verne/blueprints";
import {
  addCollectionEntry,
  analyzeInline,
  analyzeText,
  applyTemplate,
  compileManuscript,
  CONTENT_DIR,
  convertFolderToProject,
  createFolder,
  ensureCollection,
  EXPORT_DIR,
  countWords,
  createProject,
  getFrontmatterFields,
  isKnownBlueprint,
  joinPath,
  listCollection,
  listSnapshots,
  listSpaces,
  listTrash,
  moveEntry,
  openProject,
  readDocument,
  readDocumentMeta,
  readProjectDocuments,
  readProjectTree,
  renameEntry,
  restoreDocument,
  restoreSnapshot,
  searchProject,
  seedTemplates,
  listTemplates,
  splitFrontmatter,
  snapshotDocument,
  trashDocument,
  updateCollectionEntry,
  updateProjectManifest,
  VerneError,
  withFrontmatterFields,
  writeDocument,
  type BlueprintId,
  type CollectionEntry,
  type CompiledManuscript,
  type DocumentMeta,
  type Project,
  type QualityReport,
  type SearchResult,
  type Snapshot,
  type SpaceSummary,
  type Template,
  type TrashEntry,
  type TreeNode,
  type UpdateInfo,
} from "@verne/core";
import type { FormatState, ProseEditorHandle } from "@verne/editor";
import { ProjectTree, type FolderOption, type TreeDecoration } from "@verne/ui";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { CollectionPanel } from "./CollectionPanel.js";
import { DocHeader } from "./DocHeader.js";
import { ManuscriptPanel } from "./ManuscriptPanel.js";
import { ExportPanel } from "./ExportPanel.js";
import { HistoryPanel } from "./HistoryPanel.js";
import { MarkdownEditor } from "./MarkdownEditor.js";
import { QualityPanel } from "./QualityPanel.js";
import { ThemeToggle } from "./ThemeToggle.js";
import { Toolbar } from "./Toolbar.js";
import { TrashPanel } from "./TrashPanel.js";
import { hostFs, initHost, pickDirectory, previewLibrary, saveExportFile } from "./host.js";
import { checkForAppUpdate, currentAppVersion, openDownloadPage } from "./update.js";
import { UpdateBanner } from "./UpdateBanner.js";

const AUTOSAVE_DELAY_MS = 800;
/** Espera tras dejar de teclear antes de recalcular los subrayados de calidad. */
const INLINE_HINT_DELAY_MS = 600;
const HINTS_KEY = "verne.inline-hints";
const UPDATE_DISMISSED_KEY = "verne.update-dismissed";
const RECENTS_KEY = "verne.recent-projects";
const RECENTS_MAX = 8;
/**
 * Carpeta biblioteca. Es preferencia de la app, no formato: los espacios se
 * descubren escaneando `verne.yaml` un nivel abajo (RFC-0003 §6).
 */
const LIBRARY_KEY = "verne.library";

interface RecentProject {
  dir: string;
  name: string;
  /** Puede ser un tipo que esta versión no conozca (RFC-0003 §7.1). */
  blueprint: string;
  lastOpened: string;
}

function loadRecents(): RecentProject[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as RecentProject[]) : [];
  } catch {
    return [];
  }
}

function saveRecents(recents: RecentProject[]): void {
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
}

function loadLibrary(): string {
  return localStorage.getItem(LIBRARY_KEY) ?? "";
}

function saveLibrary(dir: string): void {
  if (dir === "") localStorage.removeItem(LIBRARY_KEY);
  else localStorage.setItem(LIBRARY_KEY, dir);
}

/** Los subrayados de calidad vienen encendidos; la preferencia se recuerda. */
function loadInlineHints(): boolean {
  return localStorage.getItem(HINTS_KEY) !== "off";
}

function saveInlineHints(on: boolean): void {
  localStorage.setItem(HINTS_KEY, on ? "on" : "off");
}

/** Última versión que el usuario decidió posponer, para no repetir el aviso. */
function loadDismissedUpdate(): string {
  return localStorage.getItem(UPDATE_DISMISSED_KEY) ?? "";
}

function saveDismissedUpdate(version: string): void {
  localStorage.setItem(UPDATE_DISMISSED_KEY, version);
}

interface OpenDoc {
  node: TreeNode;
  frontmatterRaw: string | null;
  body: string;
}

type SaveState = "saved" | "dirty" | "saving";
type View = "doc" | "colecciones" | "manuscrito" | "papelera" | "exportar" | "calidad" | "historial";

export function App() {
  const [project, setProject] = useState<Project | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [docsMeta, setDocsMeta] = useState<DocumentMeta[]>([]);
  const [doc, setDoc] = useState<OpenDoc | null>(null);
  const [view, setView] = useState<View>("doc");
  /** Fichas por nombre de colección; el espacio decide qué colecciones hay. */
  const [collectionEntries, setCollectionEntries] = useState<Record<string, CollectionEntry[]>>({});
  /** Plantillas leídas de `plantillas/`: del disco, no del código. */
  const [templates, setTemplates] = useState<Template[]>([]);
  /** La obra compilada, solo en los espacios que son una obra larga. */
  const [compiled, setCompiled] = useState<CompiledManuscript | null>(null);
  const [trashEntries, setTrashEntries] = useState<TrashEntry[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  /** Documento completo a exportar: el perfil "cms" necesita su frontmatter. */
  const [exportParts, setExportParts] = useState<{ frontmatterRaw: string | null; body: string }>({
    frontmatterRaw: null,
    body: "",
  });
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [historySelected, setHistorySelected] = useState<Snapshot | null>(null);
  const [historyPreview, setHistoryPreview] = useState("");
  const [editorNonce, setEditorNonce] = useState(0);
  const [estadoFilter, setEstadoFilter] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [words, setWords] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [formatState, setFormatState] = useState<FormatState | null>(null);
  const [inlineHints, setInlineHints] = useState<boolean>(loadInlineHints);
  const [recents, setRecents] = useState<RecentProject[]>(loadRecents);
  const [library, setLibrary] = useState<string>(loadLibrary);
  /** Espacios de la biblioteca, para el conmutador de la barra lateral. */
  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [appVersion, setAppVersion] = useState("");
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "uptodate">("idle");
  const [convertDir, setConvertDir] = useState<string | null>(null);

  const editorRef = useRef<ProseEditorHandle | null>(null);
  const docRef = useRef<OpenDoc | null>(null);
  const projectRef = useRef<Project | null>(null);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inlineHintsRef = useRef(inlineHints);
  /** Rutas ya respaldadas en esta sesión: un snapshot por doc y sesión. */
  const snapshottedRef = useRef(new Set<string>());

  docRef.current = doc;
  projectRef.current = project;
  inlineHintsRef.current = inlineHints;

  const blueprint: BlueprintDef | null = project ? getBlueprint(project.manifest.blueprint) : null;

  // ── Guardado ──────────────────────────────────────────────────────────

  const refreshDocMeta = useCallback(async (path: string, name: string) => {
    const bp = projectRef.current ? getBlueprint(projectRef.current.manifest.blueprint) : null;
    const meta = await readDocumentMeta(hostFs, path, name, bp?.tagsField);
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
        await snapshotDocument(hostFs, currentProject, current.node.path);
        snapshottedRef.current.add(current.node.path);
      }
      await writeDocument(hostFs, current.node.path, {
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

  // ── Subrayados de calidad en vivo (P16) ───────────────────────────────

  /** Recalcula y aplica los subrayados sobre el documento del editor. */
  const runInlineHints = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (!inlineHintsRef.current) {
      editor.setInlineDecorations([]);
      return;
    }
    const findings = analyzeInline(editor.getPlainText());
    editor.setInlineDecorations(
      findings.map((f) => ({
        from: f.from,
        to: f.to,
        className: `uc uc--${f.category}`,
        title: `${f.message}. ${f.why}`,
      })),
    );
  }, []);

  const scheduleInlineHints = useCallback(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(runInlineHints, INLINE_HINT_DELAY_MS);
  }, [runInlineHints]);

  // Al encender/apagar la opción: reflejarlo al instante y recordarlo.
  useEffect(() => {
    saveInlineHints(inlineHints);
    runInlineHints();
  }, [inlineHints, runInlineHints]);

  // ── Aviso de nueva versión (P2: avisar, nunca descargar ni bloquear) ───

  // Chequeo discreto al arrancar: solo asoma si hay algo nuevo y no lo pospuso.
  useEffect(() => {
    void (async () => {
      setAppVersion(await currentAppVersion());
      const info = await checkForAppUpdate();
      if (info && info.latestVersion !== loadDismissedUpdate()) setUpdate(info);
    })();
  }, []);

  async function handleCheckUpdate() {
    setUpdateStatus("checking");
    const info = await checkForAppUpdate();
    if (info) {
      setUpdate(info);
      setUpdateStatus("idle");
    } else {
      setUpdate(null);
      setUpdateStatus("uptodate");
    }
  }

  function handleDismissUpdate() {
    if (update) saveDismissedUpdate(update.latestVersion);
    setUpdate(null);
  }

  const handleDocChanged = useCallback(() => {
    dirtyRef.current = true;
    setSaveState("dirty");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void saveNow(), AUTOSAVE_DELAY_MS);
    scheduleInlineHints();
  }, [saveNow, scheduleInlineHints]);

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
    const bp = getBlueprint(p.manifest.blueprint);
    setTree(await readProjectTree(hostFs, p));
    setDocsMeta(await readProjectDocuments(hostFs, p, bp.tagsField));
    setTrashEntries(await listTrash(hostFs, p));
    const entries: Record<string, CollectionEntry[]> = {};
    for (const collection of bp.collections) {
      entries[collection.name] = await listCollection(hostFs, p, collection.name);
    }
    setCollectionEntries(entries);
    // Las plantillas del espacio se siembran una vez; si ya existen, no se pisan
    // (son del usuario a partir de ese momento).
    await seedTemplates(hostFs, p, bp.templates);
    setTemplates(await listTemplates(hostFs, p));
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
    rememberRecent(p);
    await refreshProjectData(p);
  }

  /** Relee los espacios de la biblioteca (si hay una elegida). */
  const refreshSpaces = useCallback(async (dir: string) => {
    setSpaces(dir === "" ? [] : await listSpaces(hostFs, dir));
  }, []);

  async function handleChooseLibrary() {
    const dir = await pickDirectory("Elige tu carpeta de escritura");
    if (dir === null) return;
    saveLibrary(dir);
    setLibrary(dir);
    await refreshSpaces(dir);
  }

  function rememberRecent(p: Project) {
    const entry: RecentProject = {
      dir: p.dir,
      name: p.manifest.name,
      blueprint: p.manifest.blueprint,
      lastOpened: new Date().toISOString(),
    };
    setRecents((prev) => {
      const next = [entry, ...prev.filter((r) => r.dir !== p.dir)].slice(0, RECENTS_MAX);
      saveRecents(next);
      return next;
    });
  }

  // Al arrancar, prepara el anfitrión y reabre el último proyecto usado.
  useEffect(() => {
    void (async () => {
      await initHost();
      // En previsualización, la biblioteca de demo viene puesta.
      const savedLibrary = loadLibrary() || previewLibrary;
      if (savedLibrary !== "") {
        setLibrary(savedLibrary);
        await refreshSpaces(savedLibrary);
      }
      const last = loadRecents()[0];
      if (!last) return;
      try {
        await loadProject(await openProject(hostFs, last.dir));
      } catch {
        // La carpeta ya no está o no es un proyecto: se queda en Inicio.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleOpenRecent(recent: RecentProject) {
    try {
      await loadProject(await openProject(hostFs, recent.dir));
    } catch (e) {
      setRecents((prev) => {
        const next = prev.filter((r) => r.dir !== recent.dir);
        saveRecents(next);
        return next;
      });
      reportError(e);
    }
  }

  /** Salta a otro espacio de la biblioteca sin pasar por Inicio. */
  async function handleSwitchSpace(dir: string) {
    if (dir === projectRef.current?.dir) return;
    try {
      await loadProject(await openProject(hostFs, dir));
    } catch (e) {
      reportError(e);
      await refreshSpaces(library);
    }
  }

  /** Vuelve a Inicio (cambiar de proyecto) sin cerrar la app. */
  async function handleGoHome() {
    await saveNow();
    setProject(null);
    setDoc(null);
    setFormatState(null);
    setError("");
  }

  function reportError(e: unknown) {
    setError(e instanceof VerneError ? e.message : `Algo salió mal: ${String(e)}`);
  }

  async function handleOpenProject() {
    const dir = await pickDirectory("Abrir proyecto Verne");
    if (dir === null) return;
    try {
      await loadProject(await openProject(hostFs, dir));
    } catch (e) {
      // Una carpeta con Markdown pero sin verne.yaml no es un error: es una
      // invitación a adoptarla (P: función de adopción más barata que existe).
      if (e instanceof VerneError && e.code === "NOT_A_PROJECT") {
        setConvertDir(dir);
        setError("");
      } else {
        reportError(e);
      }
    }
  }

  /** Convierte la carpeta elegida en proyecto Verne, adoptando su Markdown. */
  async function handleConvertFolder(name: string, blueprintId: BlueprintId) {
    const dir = convertDir;
    if (!dir) return;
    try {
      const project = await convertFolderToProject(hostFs, dir, { name, blueprint: blueprintId });
      await ensureSpaceCollections(project, getBlueprint(blueprintId));
      setConvertDir(null);
      await loadProject(project);
    } catch (e) {
      reportError(e);
    }
  }

  async function handleCreateProject(name: string, blueprintId: BlueprintId, shapeId?: string) {
    try {
      // Con biblioteca, un espacio nuevo es una subcarpeta suya y no hay que
      // elegir carpeta. Sin biblioteca, se sigue preguntando.
      const dir =
        library !== ""
          ? await freeSpaceDir(library, name)
          : await pickDirectory("Elige una carpeta (vacía) para el espacio");
      if (dir === null) return;
      const bp = getBlueprint(blueprintId);
      const options = seedOptions(bp);
      // La forma elegida (novela corta o completa) fija la meta y las carpetas.
      const shapes = bp.manuscript?.shapes;
      const shape = shapes ? (shapes.find((s) => s.id === shapeId) ?? shapes[0]) : undefined;
      const scaffold = shape?.scaffold ?? bp.scaffold;
      const project = await createProject(hostFs, dir, {
        name,
        blueprint: blueprintId,
        starterDocument: bp.starterDocument,
        ...(scaffold ? { scaffold } : {}),
        ...(options ? { options } : {}),
        ...(shape ? { target: shape.target } : {}),
      });
      await ensureSpaceCollections(project, bp);
      await loadProject(project);
      await refreshSpaces(library);
    } catch (e) {
      reportError(e);
    }
  }

  /** Ruta libre para un espacio nuevo dentro de la biblioteca. */
  async function freeSpaceDir(libraryDir: string, name: string): Promise<string> {
    const slug = slugify(name) || "espacio";
    let dir = joinPath(libraryDir, slug);
    for (let n = 2; await hostFs.exists(dir); n++) {
      dir = joinPath(libraryDir, `${slug}-${n}`);
    }
    return dir;
  }

  /**
   * Valores admitidos de cada campo de lista: los del proyecto si ya los tiene,
   * y si no los que sugiere el espacio. El proyecto manda (RFC-0003 §5).
   */
  function effectiveOptions(p: Project, bp: BlueprintDef): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const field of bp.metaFields) {
      const fromProject = p.manifest.options?.[field.key];
      if (fromProject) result[field.key] = fromProject;
      else if (field.options) result[field.key] = [...field.options];
    }
    return result;
  }

  /** Cambia la lista de valores admitidos de un campo, en el `verne.yaml`. */
  async function handleChangeOptions(key: string, values: string[]) {
    const p = projectRef.current;
    if (!p || !blueprint) return;
    try {
      const next = { ...effectiveOptions(p, blueprint), [key]: values };
      setProject(await updateProjectManifest(hostFs, p, { options: next }));
    } catch (e) {
      reportError(e);
    }
  }

  /** Crea las carpetas de colección del espacio con su `_schema.yaml` generado. */
  async function ensureSpaceCollections(p: Project, bp: BlueprintDef) {
    for (const collection of bp.collections) {
      await ensureCollection(hostFs, p, collection.name, collectionSchemaYaml(collection));
    }
  }

  // ── Documentos ────────────────────────────────────────────────────────

  async function handleSelect(node: TreeNode) {
    if (node.kind !== "document") return;
    try {
      await saveNow(); // nunca cambiar de documento con cambios sin escribir
      const parts = await readDocument(hostFs, node.path);
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

  /** Relee las plantillas del disco: si el usuario editó una, aquí se ve. */
  async function refreshTemplates() {
    const p = projectRef.current;
    if (!p) return;
    setTemplates(await listTemplates(hostFs, p));
  }

  async function handleNewDocument(rawTitle: string, templateId?: string) {
    const p = projectRef.current;
    if (!p || !blueprint) return;
    try {
      await saveNow();
      // En un diario (naming: "fecha"), el título por defecto es la fecha de hoy
      // y el archivo se nombra con fecha ISO para que ordene cronológicamente.
      const isDaily = blueprint.naming === "fecha" && rawTitle === "";
      const title = isDaily ? todayTitle(p.manifest.language) : rawTitle;
      const slug = (isDaily ? new Date().toISOString().slice(0, 10) : slugify(title)) || "sin-titulo";
      let path = joinPath(p.dir, CONTENT_DIR, `${slug}.md`);
      for (let n = 2; await hostFs.exists(path); n++) {
        path = joinPath(p.dir, CONTENT_DIR, `${slug}-${n}.md`);
      }
      // Con plantilla: su contenido, con las variables sustituidas. Sin ella, un
      // documento en blanco con lo que el espacio rellena solo.
      const template = templateId ? templates.find((t) => t.id === templateId) : undefined;
      await writeDocument(
        hostFs,
        path,
        template
          ? splitFrontmatter(applyTemplate(template.contents, { title }))
          : newDocumentParts(blueprint, title),
      );
      setTree(await readProjectTree(hostFs, p));
      const name = path.split("/").pop()?.replace(/\.md$/, "") ?? slug;
      await refreshDocMeta(path, name);
      await handleSelect({ name, path, kind: "document" });
    } catch (e) {
      reportError(e);
    }
  }

  // ── Reorganización del árbol ──────────────────────────────────────────

  async function handleNewFolder(name: string) {
    const p = projectRef.current;
    if (!p) return;
    try {
      await createFolder(hostFs, p, name);
      setTree(await readProjectTree(hostFs, p));
    } catch (e) {
      reportError(e);
    }
  }

  /** Tras renombrar/mover, refresca el árbol y re-resuelve el doc abierto si le
   *  cambió la ruta (a él o a una carpeta que lo contiene). */
  async function afterTreeChange(oldPath: string, newPath: string) {
    const p = projectRef.current;
    if (!p) return;
    setTree(await readProjectTree(hostFs, p));
    setDocsMeta(await readProjectDocuments(hostFs, p));
    const current = docRef.current;
    if (!current) return;
    const remapped = remapPath(oldPath, newPath, current.node.path);
    if (!remapped) return;
    if (snapshottedRef.current.has(oldPath)) {
      snapshottedRef.current.delete(oldPath);
      snapshottedRef.current.add(remapped);
    }
    const name = remapped.split("/").pop()?.replace(/\.md$/i, "") ?? current.node.name;
    const parts = await readDocument(hostFs, remapped);
    setDoc({ node: { name, path: remapped, kind: "document" }, ...parts });
    setEditorNonce((n) => n + 1);
  }

  async function handleRenameNode(node: TreeNode, newName: string) {
    const p = projectRef.current;
    if (!p) return;
    try {
      await saveNow();
      const newPath = await renameEntry(hostFs, p, node.path, newName);
      await afterTreeChange(node.path, newPath);
    } catch (e) {
      reportError(e);
    }
  }

  async function handleMoveNode(node: TreeNode, targetDir: string) {
    const p = projectRef.current;
    if (!p) return;
    try {
      await saveNow();
      const newPath = await moveEntry(hostFs, p, node.path, targetDir);
      await afterTreeChange(node.path, newPath);
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
      const parts = await readDocument(hostFs, current.node.path);
      const updated = withFrontmatterFields(parts, changes);
      await writeDocument(hostFs, current.node.path, updated);
      setDoc({ ...current, frontmatterRaw: updated.frontmatterRaw });
      await refreshDocMeta(current.node.path, current.node.name);
    } catch (e) {
      reportError(e);
    }
  }

  /**
   * Cambia el estado y, en la misma escritura, recalcula los campos que se
   * derivan de él (el `draft` del blog). Solo se tocan al cambiar el estado: un
   * `draft` que el usuario haya puesto a mano sobrevive a cualquier otro cambio.
   */
  async function changeEstado(estado: string) {
    const derived: Record<string, unknown> = { estado };
    for (const field of blueprint?.metaFields ?? []) {
      if (field.derivedFromState) derived[field.key] = field.derivedFromState(estado);
    }
    await updateDocMetadata(derived);
  }

  async function handleTrash() {
    const current = docRef.current;
    const p = projectRef.current;
    if (!current || !p) return;
    try {
      dirtyRef.current = false; // el documento se va: no re-escribirlo
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      await trashDocument(hostFs, p, current.node.path);
      setDoc(null);
      setDocsMeta((prev) => prev.filter((m) => m.path !== current.node.path));
      setTree(await readProjectTree(hostFs, p));
      setTrashEntries(await listTrash(hostFs, p));
    } catch (e) {
      reportError(e);
    }
  }

  async function handleRestore(entry: TrashEntry) {
    const p = projectRef.current;
    if (!p) return;
    try {
      const restored = await restoreDocument(hostFs, p, entry.path);
      setTree(await readProjectTree(hostFs, p));
      setTrashEntries(await listTrash(hostFs, p));
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
    setSearchResults(await searchProject(hostFs, p, query, blueprint?.tagsField));
  }

  async function reloadCollection(p: Project, name: string) {
    const entries = await listCollection(hostFs, p, name);
    setCollectionEntries((prev) => ({ ...prev, [name]: entries }));
  }

  async function handleAddCollectionEntry(name: string, fields: Record<string, unknown>) {
    const p = projectRef.current;
    const def = blueprint?.collections.find((c) => c.name === name);
    if (!p || !def) return;
    try {
      // El nombre del archivo sale de los dos primeros campos: legible en el
      // explorador, que es de lo que va el formato.
      const slug = slugify(
        def.fields
          .slice(0, 2)
          .map((f) => String(fields[f.key] ?? ""))
          .join("-"),
      );
      await ensureCollection(hostFs, p, name, collectionSchemaYaml(def));
      await addCollectionEntry(hostFs, p, name, slug || "ficha", fields);
      await reloadCollection(p, name);
    } catch (e) {
      reportError(e);
    }
  }

  async function handleUpdateCollectionEntry(
    name: string,
    path: string,
    changes: Record<string, unknown>,
  ) {
    const p = projectRef.current;
    if (!p) return;
    try {
      await updateCollectionEntry(hostFs, path, changes);
      await reloadCollection(p, name);
    } catch (e) {
      reportError(e);
    }
  }

  async function switchView(v: View) {
    await saveNow();
    if (v === "manuscrito") await refreshManuscript();
    setView(v);
  }

  /** Recompone el manuscrito leyendo el árbol: el avance sale de los archivos. */
  async function refreshManuscript() {
    const p = projectRef.current;
    if (!p) return;
    try {
      setCompiled(await compileManuscript(hostFs, p));
    } catch (e) {
      reportError(e);
    }
  }

  async function handleChangeTarget(target: number) {
    const p = projectRef.current;
    if (!p) return;
    try {
      setProject(await updateProjectManifest(hostFs, p, { target }));
    } catch (e) {
      reportError(e);
    }
  }

  /** Exporta la obra entera como un solo Markdown. */
  async function handleCompile() {
    const p = projectRef.current;
    if (!p) return;
    try {
      const manuscript = await compileManuscript(hostFs, p);
      setCompiled(manuscript);
      await handleSaveExportFile(`${slugify(p.manifest.name) || "manuscrito"}.md`, manuscript.markdown);
    } catch (e) {
      reportError(e);
    }
  }

  // ── Exportación y calidad ─────────────────────────────────────────────

  async function handleOpenExport() {
    const current = docRef.current;
    if (!current) return;
    try {
      await saveNow();
      const parts = await readDocument(hostFs, current.node.path);
      setExportParts(parts);
      setView("exportar");
    } catch (e) {
      reportError(e);
    }
  }

  async function handleOpenQuality() {
    const current = docRef.current;
    if (!current) return;
    try {
      await saveNow();
      const parts = await readDocument(hostFs, current.node.path);
      setQualityReport(analyzeText(parts.body));
      setView("calidad");
    } catch (e) {
      reportError(e);
    }
  }

  // ── Historial ─────────────────────────────────────────────────────────

  async function handleOpenHistory() {
    const current = docRef.current;
    const p = projectRef.current;
    if (!current || !p) return;
    try {
      await saveNow();
      const snapshots = await listSnapshots(hostFs, p, current.node.path);
      setHistory(snapshots);
      const first = snapshots[0] ?? null;
      setHistorySelected(first);
      setHistoryPreview(first ? (await readDocument(hostFs, first.path)).body : "");
      setView("historial");
    } catch (e) {
      reportError(e);
    }
  }

  async function handleSelectSnapshot(snapshot: Snapshot) {
    try {
      setHistorySelected(snapshot);
      setHistoryPreview((await readDocument(hostFs, snapshot.path)).body);
    } catch (e) {
      reportError(e);
    }
  }

  async function handleRestoreSnapshot(snapshot: Snapshot) {
    const current = docRef.current;
    const p = projectRef.current;
    if (!current || !p) return;
    try {
      await restoreSnapshot(hostFs, p, current.node.path, snapshot.path);
      // El estado restaurado ya está respaldado: evita un snapshot duplicado
      // en el próximo guardado de esta sesión.
      snapshottedRef.current.add(current.node.path);
      const parts = await readDocument(hostFs, current.node.path);
      dirtyRef.current = false;
      setSaveState("saved");
      setDoc({ node: current.node, frontmatterRaw: parts.frontmatterRaw, body: parts.body });
      setWords(countWords(parts.body));
      setEditorNonce((n) => n + 1); // fuerza el remontaje del editor con lo restaurado
      await refreshDocMeta(current.node.path, current.node.name);
      setView("doc");
    } catch (e) {
      reportError(e);
    }
  }

  async function handleSaveAuthor(author: string) {
    const p = projectRef.current;
    if (!p) return;
    try {
      setProject(await updateProjectManifest(hostFs, p, { author }));
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
      return await saveExportFile(joinPath(p.dir, EXPORT_DIR), suggestedName, contents);
    } catch (e) {
      reportError(e);
      return false;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  const updateBanner = update ? (
    <UpdateBanner
      info={update}
      onDownload={(url) => void openDownloadPage(url)}
      onDismiss={handleDismissUpdate}
    />
  ) : null;

  if (!project || !blueprint) {
    return (
      <Welcome
        recents={recents}
        library={library}
        spaces={spaces}
        onChooseLibrary={() => void handleChooseLibrary()}
        onOpenSpace={(dir) => void handleSwitchSpace(dir)}
        onOpenRecent={(r) => void handleOpenRecent(r)}
        onOpen={handleOpenProject}
        onCreate={handleCreateProject}
        error={error}
        banner={updateBanner}
        appVersion={appVersion}
        updateStatus={updateStatus}
        onCheckUpdate={() => void handleCheckUpdate()}
        convertDir={convertDir}
        onConvert={handleConvertFolder}
        onCancelConvert={() => setConvertDir(null)}
      />
    );
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

  const folderOptions: FolderOption[] = [
    { path: joinPath(project.dir, CONTENT_DIR), label: "Raíz" },
  ];
  collectFolderOptions(tree, 0, folderOptions);

  // El estilo del espacio: variables CSS sobre el tema claro/oscuro, que es el
  // mecanismo que la app ya usaba. `data-space` deja engancharle reglas.
  const spaceStyle = {
    "--space-accent": blueprint.theme.accent,
    "--space-accent-dark": blueprint.theme.accentDark,
  } as CSSProperties;
  // La pestaña de fichas existe si el espacio declara colecciones; su etiqueta es
  // la de la colección cuando hay una sola ("Envíos"), genérica cuando hay varias.
  const hasCollections = blueprint.collections.length > 0;
  const collectionsLabel =
    blueprint.collections.length === 1 ? blueprint.collections[0]!.label : "Fichas";
  const isDaily = blueprint.naming === "fecha";
  // El panel Manuscrito existe si el espacio es UNA obra larga, no un conjunto
  // de piezas: lo declara `manuscript` (RFC-0003 §2).
  const manuscript = blueprint.manuscript;
  const target = project.manifest.target ?? manuscript?.defaultTarget ?? 0;

  return (
    <div
      className={`workspace${focusMode ? " workspace--focus" : ""}`}
      data-space={blueprint.id}
      data-editor-font={blueprint.theme.editorFont}
      style={spaceStyle}
    >
      <aside className="sidebar">
        <header className="sidebar-header">
          <SpaceSwitcher
            current={project}
            currentLabel={blueprint.label}
            spaces={spaces}
            onSwitch={(dir) => void handleSwitchSpace(dir)}
            onGoHome={() => void handleGoHome()}
          />
        </header>

        {!isKnownBlueprint(project.manifest.blueprint) && (
          <p className="notice">
            Este proyecto es de tipo <code>{project.manifest.blueprint}</code>, que esta versión
            de Verne no conoce. Puedes leerlo y editarlo con las herramientas básicas; su tipo se
            conserva intacto en <code>verne.yaml</code>.
          </p>
        )}

        {(hasCollections || manuscript) && (
          <div className="view-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={view === "doc"}
              className={view === "doc" ? "tab tab--active" : "tab"}
              onClick={() => void switchView("doc")}
            >
              {blueprint.vocabulary.documentPlural}
            </button>
            {manuscript && (
              <button
                type="button"
                role="tab"
                aria-selected={view === "manuscrito"}
                className={view === "manuscrito" ? "tab tab--active" : "tab"}
                onClick={() => void switchView("manuscrito")}
              >
                Manuscrito
              </button>
            )}
            {hasCollections && (
              <button
                type="button"
                role="tab"
                aria-selected={view === "colecciones"}
                className={view === "colecciones" ? "tab tab--active" : "tab"}
                onClick={() => void switchView("colecciones")}
              >
                {collectionsLabel}
              </button>
            )}
          </div>
        )}

        <NewDocumentForm
          placeholder={
            isDaily ? todayTitle(project.manifest.language) : blueprint.vocabulary.newDocumentPlaceholder
          }
          allowEmpty={isDaily}
          templates={templates}
          onFocusTemplates={() => void refreshTemplates()}
          onCreate={(title, templateId) => void handleNewDocument(title, templateId)}
        />

        <NewFolderForm onCreate={handleNewFolder} />

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
              folders={folderOptions}
              onRename={(node, name) => void handleRenameNode(node, name)}
              onMove={(node, target) => void handleMoveNode(node, target)}
            />
          )}
        </nav>

        <footer className="sidebar-footer">
          <button type="button" className="linklike" onClick={() => void switchView("papelera")}>
            Papelera ({trashEntries.length})
          </button>
        </footer>
      </aside>

      <main className="main">
        {updateBanner}
        {error && <p className="error">{error}</p>}
        {view === "manuscrito" && manuscript && compiled ? (
          <ManuscriptPanel
            compiled={compiled}
            target={target}
            onChangeTarget={(next) => void handleChangeTarget(next)}
            onSelect={(node) => void handleSelect(node)}
            onCompile={() => void handleCompile()}
          />
        ) : view === "colecciones" && hasCollections ? (
          <CollectionPanel
            collections={blueprint.collections}
            entries={collectionEntries}
            docs={docsMeta}
            onAdd={(name, fields) => void handleAddCollectionEntry(name, fields)}
            onUpdate={(name, path, changes) =>
              void handleUpdateCollectionEntry(name, path, changes)
            }
          />
        ) : view === "papelera" ? (
          <TrashPanel entries={trashEntries} onRestore={(entry) => void handleRestore(entry)} />
        ) : view === "calidad" && doc && qualityReport ? (
          <QualityPanel
            title={currentMeta?.title ?? doc.node.name}
            report={qualityReport}
            onClose={() => setView("doc")}
          />
        ) : view === "historial" && doc ? (
          <HistoryPanel
            title={currentMeta?.title ?? doc.node.name}
            snapshots={history}
            selected={historySelected}
            previewBody={historyPreview}
            onSelect={(s) => void handleSelectSnapshot(s)}
            onRestore={(s) => void handleRestoreSnapshot(s)}
            onClose={() => setView("doc")}
          />
        ) : view === "exportar" && doc ? (
          <ExportPanel
            blueprint={blueprint}
            title={currentMeta?.title ?? doc.node.name}
            body={exportParts.body}
            frontmatterRaw={exportParts.frontmatterRaw}
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
              states={blueprint.states}
              metaFields={blueprint.metaFields}
              fields={getFrontmatterFields({
                frontmatterRaw: doc.frontmatterRaw,
                body: doc.body,
              })}
              options={effectiveOptions(project, blueprint)}
              onChangeTitle={(title) => void updateDocMetadata({ title })}
              onChangeEstado={(estado) => void changeEstado(estado)}
              onChangeField={(key, value) => void updateDocMetadata({ [key]: value })}
              onChangeOptions={(key, values) => void handleChangeOptions(key, values)}
              onExport={() => void handleOpenExport()}
              onQuality={() => void handleOpenQuality()}
              onHistory={() => void handleOpenHistory()}
              onTrash={() => void handleTrash()}
            />
            <MarkdownEditor
              key={`${doc.node.path}#${editorNonce}`}
              initialBody={doc.body}
              onReady={(handle) => {
                editorRef.current = handle;
                if (handle) runInlineHints();
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
          {doc && view === "doc" && (
            <button
              type="button"
              className="linklike"
              aria-pressed={inlineHints}
              onClick={() => setInlineHints((v) => !v)}
              title="Subraya repeticiones, frases largas y muletillas mientras escribes"
            >
              {inlineHints ? "Marcas: sí" : "Marcas: no"}
            </button>
          )}
          <ThemeToggle />
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

/**
 * Conmutador de espacios (RFC-0003 §6): el espacio activo y los demás de la
 * biblioteca, para saltar entre ellos sin volver a Inicio. Sin biblioteca
 * elegida solo muestra el nombre y el botón de cambiar de proyecto.
 */
function SpaceSwitcher({
  current,
  currentLabel,
  spaces,
  onSwitch,
  onGoHome,
}: {
  current: Project;
  currentLabel: string;
  spaces: SpaceSummary[];
  onSwitch: (dir: string) => void;
  onGoHome: () => void;
}) {
  const [open, setOpen] = useState(false);
  const others = spaces.filter((s) => s.dir !== current.dir);

  return (
    <div className="space-switcher">
      <button
        type="button"
        className="space-current"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        title={current.dir}
      >
        <span className="project-name">{current.manifest.name}</span>
        <span className="badge">{currentLabel}</span>
        <span className="space-caret" aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <ul className="space-list" role="menu">
          {others.map((space) => (
            <li key={space.dir} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSwitch(space.dir);
                }}
                title={space.dir}
              >
                <span className="space-list-name">{space.manifest.name}</span>
                <span className="badge">{getBlueprint(space.manifest.blueprint).label}</span>
              </button>
            </li>
          ))}
          {others.length === 0 && (
            <li className="space-list-empty" role="none">
              No hay otros espacios en tu carpeta de escritura.
            </li>
          )}
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="space-list-home"
              onClick={() => {
                setOpen(false);
                onGoHome();
              }}
            >
              ⌂ Inicio (crear o abrir otro)
            </button>
          </li>
        </ul>
      )}
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
  allowEmpty,
  templates,
  onFocusTemplates,
  onCreate,
}: {
  placeholder: string;
  allowEmpty: boolean;
  templates: Template[];
  /** Se avisa al abrir el selector para releer `plantillas/` del disco. */
  onFocusTemplates: () => void;
  onCreate: (title: string, templateId?: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");
  return (
    <form
      className="new-doc"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim() || allowEmpty) {
          onCreate(title.trim(), templateId || undefined);
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
      {templates.length > 0 && (
        <select
          className="new-doc-template"
          value={templateId}
          aria-label="Plantilla"
          onMouseDown={onFocusTemplates}
          onFocus={onFocusTemplates}
          onChange={(e) => setTemplateId(e.target.value)}
        >
          <option value="">En blanco</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      )}
    </form>
  );
}

function NewFolderForm({ onCreate }: { onCreate: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (!open) {
    return (
      <button type="button" className="new-folder-toggle linklike" onClick={() => setOpen(true)}>
        ＋ Nueva carpeta
      </button>
    );
  }
  return (
    <form
      className="new-doc new-folder"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onCreate(name.trim());
        setName("");
        setOpen(false);
      }}
    >
      <input
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name.trim() === "") setOpen(false);
        }}
        placeholder="Nombre de la carpeta…"
        aria-label="Nombre de la carpeta"
      />
      <button type="submit" title="Crear carpeta">
        +
      </button>
    </form>
  );
}

function ConvertCard({
  dir,
  onConvert,
  onCancel,
}: {
  dir: string;
  onConvert: (name: string, blueprint: BlueprintId) => void;
  onCancel: () => void;
}) {
  const folderName = dir.split(/[/\\]/).filter(Boolean).pop() ?? "Mi proyecto";
  const [name, setName] = useState(folderName);
  const [blueprint, setBlueprint] = useState<BlueprintId>("blog");

  return (
    <section className="card card--convert">
      <h2>Esta carpeta aún no es un proyecto Verne</h2>
      <p className="convert-note">
        <code>{dir}</code> no tiene <code>verne.yaml</code>. Verne puede adoptarla: crea el
        proyecto aquí mismo y recoge tu Markdown en <code>contenido/</code>. Tus archivos no
        se borran ni cambian de formato — solo se ordenan.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onConvert(name.trim(), blueprint);
        }}
      >
        <label>
          Nombre del proyecto
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Tipo de proyecto
          <select value={blueprint} onChange={(e) => setBlueprint(e.target.value as BlueprintId)}>
            {listBlueprints().map((bp) => (
              <option key={bp.id} value={bp.id}>
                {bp.label}
              </option>
            ))}
          </select>
        </label>
        <div className="convert-actions">
          <button type="submit">Convertir en proyecto Verne</button>
          <button type="button" className="linklike" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}

function Welcome({
  recents,
  library,
  spaces,
  onChooseLibrary,
  onOpenSpace,
  onOpenRecent,
  onOpen,
  onCreate,
  error,
  banner,
  appVersion,
  updateStatus,
  onCheckUpdate,
  convertDir,
  onConvert,
  onCancelConvert,
}: {
  recents: RecentProject[];
  library: string;
  spaces: SpaceSummary[];
  onChooseLibrary: () => void;
  onOpenSpace: (dir: string) => void;
  onOpenRecent: (recent: RecentProject) => void;
  onOpen: () => void;
  onCreate: (name: string, blueprint: BlueprintId, shapeId?: string) => void;
  error: string;
  banner: ReactNode;
  appVersion: string;
  updateStatus: "idle" | "checking" | "uptodate";
  onCheckUpdate: () => void;
  convertDir: string | null;
  onConvert: (name: string, blueprint: BlueprintId) => void;
  onCancelConvert: () => void;
}) {
  const [name, setName] = useState("");
  const [shape, setShape] = useState("");
  const [blueprint, setBlueprint] = useState<BlueprintId>("blog");
  const shapes = getBlueprint(blueprint).manuscript?.shapes;

  return (
    <main className="welcome">
      <div className="welcome-top">
        <h1>Verne</h1>
        <ThemeToggle />
      </div>
      <p className="tagline">Tus palabras, en tus archivos.</p>
      {banner}
      {error && <p className="error">{error}</p>}
      {convertDir && (
        <ConvertCard dir={convertDir} onConvert={onConvert} onCancel={onCancelConvert} />
      )}
      <section className="card">
        <div className="library-header">
          <h2>Tu carpeta de escritura</h2>
          <button type="button" className="linklike" onClick={onChooseLibrary}>
            {library === "" ? "Elegir…" : "Cambiar…"}
          </button>
        </div>
        {library === "" ? (
          <p className="export-note">
            Elige una carpeta y Verne mostrará como espacios los proyectos que haya dentro. Sigue
            siendo una carpeta normal en tu equipo: Verne no mueve nada ni añade ningún archivo
            para gestionarla.
          </p>
        ) : (
          <>
            <p className="library-path">
              <code>{library}</code>
            </p>
            {spaces.length === 0 ? (
              <p className="export-note">
                Todavía no hay espacios aquí. Crea el primero abajo.
              </p>
            ) : (
              <ul className="recents">
                {spaces.map((space) => (
                  <li key={space.dir}>
                    <button
                      type="button"
                      className="recent"
                      onClick={() => onOpenSpace(space.dir)}
                    >
                      <span className="recent-name">{space.manifest.name}</span>
                      <span className="recent-meta">
                        <span className="badge">
                          {getBlueprint(space.manifest.blueprint).label}
                        </span>
                        <span className="recent-dir">{space.folder}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
      {/* Los recientes se quedan: un espacio puede vivir fuera de la biblioteca
          (la carpeta de siempre de alguien, o una adoptada de Markdown suelto). */}
      {recents.filter((r) => !spaces.some((s) => s.dir === r.dir)).length > 0 && (
        <section className="card">
          <h2>Fuera de tu carpeta de escritura</h2>
          <ul className="recents">
            {recents
              .filter((r) => !spaces.some((s) => s.dir === r.dir))
              .map((r) => (
                <li key={r.dir}>
                  <button type="button" className="recent" onClick={() => onOpenRecent(r)}>
                    <span className="recent-name">{r.name}</span>
                    <span className="recent-meta">
                      <span className="badge">{getBlueprint(r.blueprint).label}</span>
                      <span className="recent-dir">{r.dir}</span>
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}
      <section className="card">
        <h2>Crear un espacio</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onCreate(name.trim(), blueprint, shape || undefined);
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
            Tipo de espacio
            <select
              value={blueprint}
              onChange={(e) => {
                setBlueprint(e.target.value as BlueprintId);
                setShape("");
              }}
            >
              {listBlueprints().map((bp) => (
                <option key={bp.id} value={bp.id}>
                  {bp.label}
                </option>
              ))}
            </select>
          </label>
          {/* Solo los espacios que son UNA obra larga ofrecen forma: es lo que
              distingue una novela corta de una completa. */}
          {shapes && (
            <label>
              Extensión
              <select value={shape} onChange={(e) => setShape(e.target.value)}>
                {shapes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="submit">
            {library === "" ? "Elegir carpeta y crear" : "Crear en mi carpeta de escritura"}
          </button>
        </form>
      </section>
      <section className="card">
        <h2>Abrir un proyecto existente</h2>
        <button type="button" onClick={onOpen}>
          Abrir carpeta…
        </button>
      </section>
      <footer className="welcome-footer">
        <span>{appVersion ? `Verne v${appVersion}` : "Verne"}</span>
        <button
          type="button"
          className="linklike"
          onClick={onCheckUpdate}
          disabled={updateStatus === "checking"}
        >
          {updateStatus === "checking" ? "Buscando…" : "Buscar actualizaciones"}
        </button>
        {updateStatus === "uptodate" && <span className="welcome-uptodate">Estás al día.</span>}
      </footer>
    </main>
  );
}

function todayTitle(language: string): string {
  try {
    return new Date().toLocaleDateString(language, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Reasigna la ruta de un documento abierto cuando él o una carpeta que lo
 *  contiene se renombra o se mueve. Devuelve null si no le afecta. */
function remapPath(oldPath: string, newPath: string, openPath: string): string | null {
  if (openPath === oldPath) return newPath;
  if (openPath.startsWith(`${oldPath}/`)) return newPath + openPath.slice(oldPath.length);
  return null;
}

/** Aplana las carpetas del árbol como destinos de "mover", con sangría. */
function collectFolderOptions(nodes: TreeNode[], depth: number, out: FolderOption[]): void {
  for (const node of nodes) {
    if (node.kind !== "folder") continue;
    out.push({ path: node.path, label: `${"· ".repeat(depth + 1)}${node.name}` });
    if (node.children) collectFolderOptions(node.children, depth + 1, out);
  }
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

/**
 * Frontmatter de un documento nuevo en blanco: título, estado inicial y los
 * campos que el espacio rellena solo (`autoOnCreate` y `derivedFromState`). Así
 * una entrada de blog nace con su `createdAt` y su `draft` sin código de blog.
 */
/**
 * Valores iniciales de los campos de lista que el espacio sugiere, para escribir
 * en el `verne.yaml` del proyecto nuevo. A partir de ahí son del usuario.
 */
function seedOptions(blueprint: BlueprintDef): Record<string, string[]> | null {
  const options: Record<string, string[]> = {};
  for (const field of blueprint.metaFields) {
    if (field.options) options[field.key] = [...field.options];
  }
  return Object.keys(options).length > 0 ? options : null;
}

function newDocumentParts(blueprint: BlueprintDef, title: string) {
  const fields: Record<string, unknown> = { title, estado: blueprint.initialState };
  for (const field of blueprint.metaFields) {
    if (field.autoOnCreate && field.type === "date") fields[field.key] = new Date().toISOString();
    if (field.derivedFromState) fields[field.key] = field.derivedFromState(blueprint.initialState);
  }
  return withFrontmatterFields({ frontmatterRaw: null, body: "" }, fields);
}
