import { readDocument } from "./document.js";
import { getFrontmatterFields, readTags } from "./frontmatter.js";
import type { VerneFs } from "./fs.js";
import { readProjectTree, type Project, type TreeNode } from "./project.js";

export interface SearchResult {
  path: string;
  name: string;
  title: string;
  /** Línea (recortada) donde aparece la primera coincidencia. */
  snippet: string;
}

const MAX_RESULTS = 50;
const MAX_SNIPPET = 160;

/**
 * Búsqueda global del proyecto: título, etiquetas y cuerpo, insensible a
 * mayúsculas y acentos ("cafe" encuentra "café").
 */
export async function searchProject(
  fs: VerneFs,
  project: Project,
  query: string,
): Promise<SearchResult[]> {
  const needle = fold(query.trim());
  if (needle === "") return [];

  const docs: TreeNode[] = [];
  collect(await readProjectTree(fs, project), docs);

  const results: SearchResult[] = [];
  for (const node of docs) {
    if (results.length >= MAX_RESULTS) break;
    const parts = await readDocument(fs, node.path);
    const fields = getFrontmatterFields(parts);
    const title = typeof fields["title"] === "string" ? fields["title"] : node.name;

    let snippet: string | null = null;
    if (fold(title).includes(needle) || readTags(fields).some((t) => fold(t).includes(needle))) {
      snippet = firstNonEmptyLine(parts.body);
    } else {
      snippet = findMatchingLine(parts.body, needle);
    }
    if (snippet !== null) {
      results.push({ path: node.path, name: node.name, title, snippet });
    }
  }
  return results;
}

/** Minúsculas y sin diacríticos, para comparar. */
function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function findMatchingLine(body: string, needle: string): string | null {
  for (const line of body.split("\n")) {
    if (fold(line).includes(needle)) return truncate(line.trim());
  }
  return null;
}

function firstNonEmptyLine(body: string): string {
  for (const line of body.split("\n")) {
    if (line.trim() !== "") return truncate(line.trim());
  }
  return "";
}

function truncate(line: string): string {
  return line.length > MAX_SNIPPET ? `${line.slice(0, MAX_SNIPPET)}…` : line;
}

function collect(nodes: TreeNode[], out: TreeNode[]): void {
  for (const node of nodes) {
    if (node.kind === "document") out.push(node);
    if (node.children) collect(node.children, out);
  }
}
