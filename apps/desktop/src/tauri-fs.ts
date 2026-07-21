import {
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import type { VerneFs } from "@verne/core";

/** Adaptador del sistema de archivos de Tauri a la interfaz que core espera. */
export const tauriFs: VerneFs = {
  exists: (path) => exists(path),
  mkdir: (path) => mkdir(path, { recursive: true }),
  readTextFile: (path) => readTextFile(path),
  writeTextFile: (path, contents) => writeTextFile(path, contents),
  readDir: async (path) =>
    (await readDir(path)).map((e) => ({ name: e.name, isDirectory: e.isDirectory })),
  remove: (path) => remove(path, { recursive: true }),
};
