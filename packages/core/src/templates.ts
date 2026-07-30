import { splitFrontmatter } from "./document.js";
import { getFrontmatterFields } from "./frontmatter.js";
import { joinPath, sanitizeName, type VerneFs } from "./fs.js";
import type { Project } from "./project.js";

/**
 * Plantillas de documento (RFC-0003 §4, D13).
 *
 * Una plantilla es un archivo Markdown en `plantillas/`. El espacio siembra las
 * suyas al nacer el proyecto y desde ese momento son del usuario: la app lee
 * siempre del disco, así que editarlas, borrarlas o añadir otras es editar
 * archivos normales con cualquier editor. Un solo camino de código para las
 * plantillas integradas y para las propias.
 */
export const TEMPLATES_DIR = "plantillas";

export interface Template {
  /** Nombre del archivo sin `.md`. */
  id: string;
  /** `title` del frontmatter si lo trae, o el nombre del archivo. */
  label: string;
  /** Contenido tal cual, con su frontmatter y sus variables sin sustituir. */
  contents: string;
}

/** Definición que aporta un espacio (misma forma que `TemplateDef`). */
export interface TemplateSeed {
  id: string;
  label: string;
  contents: string;
}

/**
 * Escribe en `plantillas/` las plantillas del espacio que no existan ya.
 *
 * NO sobrescribe: una plantilla que el usuario editó es suya, y perder sus
 * cambios al actualizar Verne sería exactamente el tipo de sorpresa que este
 * proyecto no se permite. El precio, aceptado en RFC-0003 §4, es que una mejora
 * de una plantilla integrada no llega a quien ya la tenía.
 */
export async function seedTemplates(
  fs: VerneFs,
  project: Project,
  seeds: readonly TemplateSeed[],
): Promise<void> {
  if (seeds.length === 0) return;
  const dir = joinPath(project.dir, TEMPLATES_DIR);
  await fs.mkdir(dir);
  for (const seed of seeds) {
    const path = joinPath(dir, `${sanitizeName(seed.id)}.md`);
    if (!(await fs.exists(path))) await fs.writeTextFile(path, seed.contents);
  }
}

/** Lista las plantillas del proyecto, por nombre de archivo. */
export async function listTemplates(fs: VerneFs, project: Project): Promise<Template[]> {
  const dir = joinPath(project.dir, TEMPLATES_DIR);
  if (!(await fs.exists(dir))) return [];
  const templates: Template[] = [];
  for (const entry of await fs.readDir(dir)) {
    if (entry.isDirectory || !entry.name.toLowerCase().endsWith(".md")) continue;
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
    const id = entry.name.replace(/\.md$/i, "");
    const contents = await fs.readTextFile(joinPath(dir, entry.name));
    const title = getFrontmatterFields(splitFrontmatter(contents))["title"];
    const label =
      typeof title === "string" && title.trim() !== "" && !title.includes("{{") ? title : id;
    templates.push({ id, label, contents });
  }
  return templates.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

/**
 * Sustituye las variables de una plantilla. `{{title}}` es el título que el
 * usuario escribió y `{{fecha}}` la fecha y hora actuales en ISO 8601 — el
 * formato que espera un generador de sitios.
 *
 * Los marcadores van SIEMPRE entre comillas en la plantilla
 * (`title: "{{title}}"`), por dos razones: así el archivo de plantilla es YAML
 * válido antes de sustituir nada —se puede abrir, parsear y editar con cualquier
 * herramienta— y así el valor se inserta escapado, sin que un título con dos
 * puntos rompa el frontmatter del documento nuevo.
 */
export function applyTemplate(contents: string, vars: { title: string; now?: Date }): string {
  const now = vars.now ?? new Date();
  return contents
    .replaceAll("{{title}}", escapeInsideQuotes(vars.title))
    .replaceAll("{{fecha}}", now.toISOString());
}

/** Escapa un valor para meterlo dentro de unas comillas dobles de YAML. */
function escapeInsideQuotes(value: string): string {
  const json = JSON.stringify(value);
  return json.slice(1, -1);
}
