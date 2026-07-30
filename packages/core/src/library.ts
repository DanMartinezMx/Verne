import { joinPath, type VerneFs } from "./fs.js";
import { parseManifest, type ProjectManifest } from "./manifest.js";
import { MANIFEST_FILE } from "./project.js";

/**
 * La biblioteca (RFC-0003 §6): una carpeta con espacios dentro.
 *
 * No inventa formato. No hay `biblioteca.yaml` ni índice: los espacios se
 * descubren buscando `verne.yaml` un nivel por debajo, porque un índice puede
 * desincronizarse de la verdad —las carpetas— y escanear un nivel cuesta
 * milisegundos. D5 aplicado a un caso pequeño.
 */
export interface SpaceSummary {
  dir: string;
  /** Nombre de la carpeta, útil cuando el manifiesto no ayuda. */
  folder: string;
  /**
   * Carpeta que lo contiene, relativa a la biblioteca; `""` si está en la raíz.
   * Es lo que permite tener `novelas/` con varias novelas dentro y verlas
   * agrupadas, sin que Verne imponga ninguna estructura.
   */
  group: string;
  manifest: ProjectManifest;
}

/**
 * Hasta dónde se baja buscando espacios. Suficiente para
 * `biblioteca/novelas/la-mia/` y un nivel más, y evita recorrer un árbol entero
 * si alguien elige su carpeta personal como biblioteca.
 */
const MAX_DEPTH = 3;

/** Carpetas de la estructura VPF: nunca contienen otro espacio. */
const RESERVED = new Set([
  "contenido",
  "colecciones",
  "plantillas",
  "recursos",
  "export",
  "papelera",
]);

/**
 * Lista los espacios de una biblioteca. Baja por las subcarpetas hasta
 * encontrarlos, así que la carpeta de escritura se puede organizar como se
 * quiera (`novelas/`, `trabajo/`, `2026/`) y Verne los encuentra igual.
 *
 * Un espacio nunca está dentro de otro: al encontrar un `verne.yaml` se deja de
 * bajar. Una carpeta sin manifiesto o con uno ilegible se ignora sin ruido: la
 * carpeta de alguien también tiene cosas que no son espacios.
 *
 * A diferencia de `openProject`, no toca nada del disco: listar no debe crear
 * `.verne/` en cada subcarpeta.
 */
export async function listSpaces(fs: VerneFs, libraryDir: string): Promise<SpaceSummary[]> {
  if (!(await fs.exists(libraryDir))) return [];
  const spaces: SpaceSummary[] = [];
  await walk(fs, libraryDir, "", 0, spaces);
  return spaces.sort(
    (a, b) =>
      a.group.localeCompare(b.group, undefined, { numeric: true }) ||
      a.manifest.name.localeCompare(b.manifest.name, undefined, { numeric: true }),
  );
}

async function walk(
  fs: VerneFs,
  dir: string,
  group: string,
  depth: number,
  out: SpaceSummary[],
): Promise<void> {
  for (const entry of await fs.readDir(dir)) {
    if (!entry.isDirectory || entry.name.startsWith(".") || RESERVED.has(entry.name)) continue;
    const child = joinPath(dir, entry.name);
    const manifestPath = joinPath(child, MANIFEST_FILE);
    if (await fs.exists(manifestPath)) {
      try {
        out.push({
          dir: child,
          folder: entry.name,
          group,
          manifest: parseManifest(await fs.readTextFile(manifestPath)),
        });
      } catch {
        // Un verne.yaml roto no debe impedir ver los demás espacios.
      }
      continue; // un espacio nunca contiene otro
    }
    if (depth + 1 < MAX_DEPTH) {
      await walk(fs, child, group === "" ? entry.name : `${group}/${entry.name}`, depth + 1, out);
    }
  }
}
