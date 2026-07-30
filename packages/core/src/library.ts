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
  manifest: ProjectManifest;
}

/**
 * Lista los espacios de una biblioteca, por nombre. Una subcarpeta sin
 * `verne.yaml` o con un manifiesto ilegible se ignora sin ruido: la carpeta de
 * escritura de alguien también tiene carpetas que no son espacios.
 *
 * A diferencia de `openProject`, no toca nada del disco: listar no debe crear
 * `.verne/` en cada subcarpeta.
 */
export async function listSpaces(fs: VerneFs, libraryDir: string): Promise<SpaceSummary[]> {
  if (!(await fs.exists(libraryDir))) return [];
  const spaces: SpaceSummary[] = [];
  for (const entry of await fs.readDir(libraryDir)) {
    if (!entry.isDirectory || entry.name.startsWith(".")) continue;
    const dir = joinPath(libraryDir, entry.name);
    const manifestPath = joinPath(dir, MANIFEST_FILE);
    if (!(await fs.exists(manifestPath))) continue;
    try {
      spaces.push({
        dir,
        folder: entry.name,
        manifest: parseManifest(await fs.readTextFile(manifestPath)),
      });
    } catch {
      // Un verne.yaml roto no debe impedir ver los demás espacios.
    }
  }
  return spaces.sort((a, b) =>
    a.manifest.name.localeCompare(b.manifest.name, undefined, { numeric: true }),
  );
}
