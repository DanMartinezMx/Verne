import { open, save } from "@tauri-apps/plugin-dialog";
import { joinPath, type VerneFs } from "@verne/core";
import { createMemoryFs } from "./preview/memory-fs.js";
import { PREVIEW_LIBRARY, seedPreviewLibrary } from "./preview/seed.js";
import { tauriFs } from "./tauri-fs.js";

/**
 * El anfitrión: de dónde salen los archivos y los diálogos.
 *
 * En Tauri (la app real) son el disco y los diálogos nativos. Fuera de Tauri y
 * en desarrollo, un sistema de archivos en memoria con espacios de demo, para
 * poder mirar la interfaz en un navegador sin instalar la cadena de Rust.
 *
 * La costura existe porque core nunca tocó el disco: siempre recibió un
 * adaptador. Aquí solo se elige cuál.
 */
const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Solo en desarrollo: una build de producción sin Tauri no tiene sentido. */
export const isPreview = !inTauri && import.meta.env.DEV;

export const hostFs: VerneFs = isPreview ? createMemoryFs() : tauriFs;

/** Siembra los datos de demo. En la app real no hace nada. */
export async function initHost(): Promise<void> {
  if (isPreview) await seedPreviewLibrary(hostFs);
}

/** Elige una carpeta. Devuelve null si el usuario cancela. */
export async function pickDirectory(title: string): Promise<string | null> {
  if (isPreview) {
    const answer = window.prompt(
      `${title}\n\nPrevisualización en navegador. Espacios de demo:\n` +
        `${PREVIEW_LIBRARY}/mi-blog\n${PREVIEW_LIBRARY}/cuentos\n${PREVIEW_LIBRARY}/la-novela`,
      joinPath(PREVIEW_LIBRARY, "la-novela"),
    );
    return answer?.trim() ? answer.trim() : null;
  }
  const dir = await open({ directory: true, title });
  return typeof dir === "string" ? dir : null;
}

/**
 * Guarda un archivo exportado. En la app real: diálogo nativo y escritura en
 * disco. En previsualización: una descarga del navegador, que es lo que un
 * navegador puede hacer.
 */
export async function saveExportFile(
  defaultDir: string,
  suggestedName: string,
  contents: string | Uint8Array,
): Promise<boolean> {
  if (isPreview) {
    downloadInBrowser(suggestedName, contents);
    return true;
  }
  const extension = suggestedName.split(".").pop() ?? "txt";
  const target = await save({
    defaultPath: joinPath(defaultDir, suggestedName),
    filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
  });
  if (typeof target !== "string") return false;
  if (typeof contents === "string") {
    await hostFs.writeTextFile(target, contents);
  } else {
    await hostFs.writeBinaryFile(target, contents);
  }
  return true;
}

function downloadInBrowser(name: string, contents: string | Uint8Array): void {
  const blob =
    typeof contents === "string"
      ? new Blob([contents], { type: "text/plain;charset=utf-8" })
      : new Blob([contents as BlobPart]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
