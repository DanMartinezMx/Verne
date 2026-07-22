/**
 * Sistema de archivos abstracto de Verne.
 *
 * `@verne/core` corre dentro de un WebView (Tauri hoy, navegador mañana), así
 * que nunca toca el disco directamente: la app anfitriona inyecta un adaptador
 * que implementa esta interfaz (Tauri plugin-fs en escritorio, node:fs en
 * tests). Las rutas son cadenas con separador "/", que Windows también acepta.
 */

export interface FsEntry {
  name: string;
  isDirectory: boolean;
}

export interface VerneFs {
  exists(path: string): Promise<boolean>;
  /** Crea el directorio y sus padres (mkdir -p). */
  mkdir(path: string): Promise<void>;
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, contents: string): Promise<void>;
  /** Escribe contenido binario (p. ej. un DOCX exportado). */
  writeBinaryFile(path: string, contents: Uint8Array): Promise<void>;
  readDir(path: string): Promise<FsEntry[]>;
  /** Elimina recursivamente. */
  remove(path: string): Promise<void>;
  /** Mueve/renombra un archivo o carpeta. */
  rename(from: string, to: string): Promise<void>;
}

export function joinPath(...parts: string[]): string {
  return parts
    .filter((p) => p.length > 0)
    .map((p, i) => (i === 0 ? p.replace(/[/\\]+$/, "") : p.replace(/^[/\\]+|[/\\]+$/g, "")))
    .join("/");
}
