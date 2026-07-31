import { joinPath, type VerneFs } from "./fs.js";
import type { Project } from "./project.js";

/**
 * Diccionario del proyecto: las palabras que son correctas aquí aunque no estén
 * en ningún diccionario del español — los nombres de tus personajes y de los
 * lugares que te inventaste (RFC-0004 §5).
 *
 * Vive en la RAÍZ del proyecto y no en `.verne/`, que es prescindible por
 * contrato VPF: borrar esa carpeta nunca debe perder nada, y trescientas
 * decisiones sobre cómo se llama la gente de tu novela no son estado derivado.
 * En la raíz además viaja al copiar la carpeta, se versiona con git y se edita
 * con cualquier editor de texto.
 */
export const DICTIONARY_FILE = "diccionario.txt";

/** Lee las palabras del proyecto. Sin archivo, lista vacía. */
export async function readCustomWords(fs: VerneFs, project: Project): Promise<string[]> {
  const path = joinPath(project.dir, DICTIONARY_FILE);
  if (!(await fs.exists(path))) return [];
  return parseCustomWords(await fs.readTextFile(path));
}

/**
 * Una palabra por línea. Se ignoran las vacías y los comentarios con `#`, para
 * que alguien pueda agrupar sus nombres a mano con encabezados.
 */
export function parseCustomWords(text: string): string[] {
  const words = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
  return [...new Set(words)];
}

/**
 * Añade palabras al diccionario del proyecto y devuelve la lista resultante.
 * Ordenadas y sin repetidos: el archivo lo va a leer una persona, y un diff de
 * git legible importa más que preservar el orden en que se añadieron.
 */
export async function addCustomWords(
  fs: VerneFs,
  project: Project,
  words: readonly string[],
): Promise<string[]> {
  const existing = await readCustomWords(fs, project);
  const clean = words.map((w) => w.trim()).filter((w) => w !== "");
  const all = [...new Set([...existing, ...clean])].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  const header =
    "# Palabras correctas en este proyecto que no están en el diccionario del español\n" +
    "# (nombres de personajes, lugares inventados). Una por línea; puedes editarlo a mano.\n";
  await fs.writeTextFile(joinPath(project.dir, DICTIONARY_FILE), `${header}\n${all.join("\n")}\n`);
  return all;
}
