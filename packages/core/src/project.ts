import { VerneError } from "./errors.js";
import { joinPath, type VerneFs } from "./fs.js";
import {
  parseManifest,
  serializeManifest,
  VPF_VERSION,
  type BlueprintId,
  type ProjectManifest,
} from "./manifest.js";

/** Layout VPF (docs/spec/vpf). Los nombres de carpeta son parte de la spec. */
export const MANIFEST_FILE = "verne.yaml";
export const CONTENT_DIR = "contenido";
export const RESOURCES_DIR = "recursos";
export const EXPORT_DIR = "export";
/** Estado interno SIEMPRE regenerable: borrarlo nunca pierde contenido. */
export const INTERNAL_DIR = ".verne";

export interface Project {
  dir: string;
  manifest: ProjectManifest;
}

export interface TreeNode {
  name: string;
  /** Ruta absoluta del archivo o carpeta. */
  path: string;
  kind: "folder" | "document";
  children?: TreeNode[];
}

export interface CreateProjectOptions {
  name: string;
  blueprint: BlueprintId;
  language?: string;
}

const STARTER_DOCUMENTS: Record<BlueprintId, { file: string; body: string }> = {
  blog: {
    file: "mi-primera-entrada.md",
    body: `---
title: Mi primera entrada
estado: idea
tags: []
---

Escribe aquí. Esta entrada es tuya: es un archivo Markdown normal dentro de la
carpeta \`${CONTENT_DIR}/\` de tu proyecto.
`,
  },
  cuento: {
    file: "mi-primer-cuento.md",
    body: `---
title: Mi primer cuento
estado: idea
---

Había una vez un archivo Markdown normal, dentro de la carpeta
\`${CONTENT_DIR}/\` de tu proyecto, esperando a que lo escribieras.
`,
  },
};

export async function createProject(
  fs: VerneFs,
  dir: string,
  options: CreateProjectOptions,
): Promise<Project> {
  if (await fs.exists(joinPath(dir, MANIFEST_FILE))) {
    throw new VerneError("ALREADY_A_PROJECT", `Ya existe un proyecto Verne en ${dir}`);
  }
  const manifest: ProjectManifest = {
    vpf: VPF_VERSION,
    name: options.name,
    blueprint: options.blueprint,
    language: options.language ?? "es",
    createdAt: new Date().toISOString(),
  };
  for (const sub of [CONTENT_DIR, RESOURCES_DIR, EXPORT_DIR, INTERNAL_DIR]) {
    await fs.mkdir(joinPath(dir, sub));
  }
  const starter = STARTER_DOCUMENTS[options.blueprint];
  await fs.writeTextFile(joinPath(dir, CONTENT_DIR, starter.file), starter.body);
  await fs.writeTextFile(joinPath(dir, MANIFEST_FILE), serializeManifest(manifest));
  return { dir, manifest };
}

export async function openProject(fs: VerneFs, dir: string): Promise<Project> {
  const manifestPath = joinPath(dir, MANIFEST_FILE);
  if (!(await fs.exists(manifestPath))) {
    throw new VerneError("NOT_A_PROJECT", `No hay un ${MANIFEST_FILE} en ${dir}`);
  }
  const manifest = parseManifest(await fs.readTextFile(manifestPath));
  // Garantía VPF: el estado interno es prescindible y se regenera al abrir.
  if (!(await fs.exists(joinPath(dir, INTERNAL_DIR)))) {
    await fs.mkdir(joinPath(dir, INTERNAL_DIR));
  }
  return { dir, manifest };
}

export async function readProjectTree(fs: VerneFs, project: Project): Promise<TreeNode[]> {
  const contentDir = joinPath(project.dir, CONTENT_DIR);
  if (!(await fs.exists(contentDir))) {
    return [];
  }
  return readTreeLevel(fs, contentDir);
}

async function readTreeLevel(fs: VerneFs, dir: string): Promise<TreeNode[]> {
  const entries = await fs.readDir(dir);
  const nodes: TreeNode[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const path = joinPath(dir, entry.name);
    if (entry.isDirectory) {
      nodes.push({ name: entry.name, path, kind: "folder", children: await readTreeLevel(fs, path) });
    } else if (entry.name.toLowerCase().endsWith(".md")) {
      nodes.push({ name: entry.name.replace(/\.md$/i, ""), path, kind: "document" });
    }
  }
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
  return nodes;
}
