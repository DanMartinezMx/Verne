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

/** Separadores y caracteres reservados de Windows: fuera del nombre. */
const RESERVED_CHARS = /[\\/:*?"<>|]/g;
/** Controles ASCII (rango 0x00–0x1F): fuera del nombre. */
const CONTROL_CHARS = /[\x00-\x1f]/g;

/**
 * Limpia un nombre para el disco conservando espacios, guiones y acentos
 * (VPF: los archivos los lee un humano en su explorador). Quitar los puntos de
 * los extremos es lo que impide que un nombre se convierta en `..`.
 *
 * Vive aquí, y no en organize.ts, porque project.ts también lo necesita para el
 * andamio y al revés habría dependencia circular.
 */
export function sanitizeName(raw: string): string {
  return raw
    .replace(RESERVED_CHARS, "")
    .replace(CONTROL_CHARS, "")
    .replace(/\s+/g, " ")
    .replace(/^\.+|\.+$/g, "")
    .trim();
}
