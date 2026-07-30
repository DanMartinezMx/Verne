import { countWords, readDocument } from "./document.js";
import { getFrontmatterFields, readTags } from "./frontmatter.js";
import type { VerneFs } from "./fs.js";
import { readProjectTree, type Project, type TreeNode } from "./project.js";

/**
 * Índice en memoria de los documentos del proyecto (título, estado, etiquetas,
 * palabras). A la escala de v0.x se reconstruye leyendo los archivos: es la
 * versión honesta y suficiente del futuro index.db (VPF reserva el nombre).
 */
export interface DocumentMeta {
  path: string;
  name: string;
  title: string;
  estado: string | null;
  tags: string[];
  words: number;
}

export async function readDocumentMeta(
  fs: VerneFs,
  path: string,
  name: string,
  tagsField?: string,
): Promise<DocumentMeta> {
  const parts = await readDocument(fs, path);
  const fields = getFrontmatterFields(parts);
  const title = typeof fields["title"] === "string" && fields["title"].trim() !== ""
    ? fields["title"]
    : name;
  return {
    path,
    name,
    title,
    estado: typeof fields["estado"] === "string" ? fields["estado"] : null,
    tags: readTags(fields, tagsField),
    words: countWords(parts.body),
  };
}

export async function readProjectDocuments(
  fs: VerneFs,
  project: Project,
  tagsField?: string,
): Promise<DocumentMeta[]> {
  const tree = await readProjectTree(fs, project);
  const docs: TreeNode[] = [];
  collectDocuments(tree, docs);
  const metas: DocumentMeta[] = [];
  for (const node of docs) {
    metas.push(await readDocumentMeta(fs, node.path, node.name, tagsField));
  }
  return metas;
}

function collectDocuments(nodes: TreeNode[], out: TreeNode[]): void {
  for (const node of nodes) {
    if (node.kind === "document") out.push(node);
    if (node.children) collectDocuments(node.children, out);
  }
}
