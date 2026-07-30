import { countWords, readDocument } from "./document.js";
import { getFrontmatterFields } from "./frontmatter.js";
import type { VerneFs } from "./fs.js";
import { readProjectTree, type Project, type TreeNode } from "./project.js";

/**
 * Compilación del manuscrito (RFC-0003 §3): junta todos los documentos de
 * `contenido/` en un solo Markdown, en el orden del árbol.
 *
 * El orden es el del explorador de archivos, que `readProjectTree` ya calcula
 * con `localeCompare(numeric: true)`: `01-`, `02-`, `10-` salen bien, y `2-` va
 * antes de `10-`. Por eso no hace falta un campo `orden` en el frontmatter —
 * renombrar o arrastrar un capítulo ya reordena el manuscrito, y el orden se ve
 * igual dentro y fuera de Verne.
 */
export interface CompiledPart {
  path: string;
  /** `title` del frontmatter, o el nombre del archivo. */
  title: string;
  words: number;
  /** Profundidad en el árbol: 0 = raíz de contenido. */
  depth: number;
  body: string;
}

export interface CompiledManuscript {
  parts: CompiledPart[];
  words: number;
  /** Markdown de toda la obra, con un encabezado por documento. */
  markdown: string;
}

export async function compileManuscript(
  fs: VerneFs,
  project: Project,
): Promise<CompiledManuscript> {
  const parts: CompiledPart[] = [];
  await collect(fs, await readProjectTree(fs, project), 0, parts);

  const markdown = parts
    .map((part) => {
      // El nivel del encabezado sigue la profundidad de la carpeta: una novela
      // en partes sale como parte → capítulo sin tocar el cuerpo de nada.
      const hashes = "#".repeat(Math.min(part.depth + 1, 6));
      const body = part.body.trim();
      return body === "" ? `${hashes} ${part.title}` : `${hashes} ${part.title}\n\n${body}`;
    })
    .join("\n\n");

  return {
    parts,
    words: parts.reduce((total, part) => total + part.words, 0),
    markdown: markdown === "" ? "" : `${markdown}\n`,
  };
}

async function collect(
  fs: VerneFs,
  nodes: TreeNode[],
  depth: number,
  out: CompiledPart[],
): Promise<void> {
  for (const node of nodes) {
    if (node.kind === "folder") {
      // La carpeta entra como encabezado propio (la "parte" de la novela) para
      // que la estructura del árbol sobreviva a la compilación.
      out.push({ path: node.path, title: node.name, words: 0, depth, body: "" });
      await collect(fs, node.children ?? [], depth + 1, out);
      continue;
    }
    const doc = await readDocument(fs, node.path);
    const fields = getFrontmatterFields(doc);
    const title =
      typeof fields["title"] === "string" && fields["title"].trim() !== ""
        ? fields["title"]
        : node.name;
    out.push({ path: node.path, title, words: countWords(doc.body), depth, body: doc.body });
  }
}
