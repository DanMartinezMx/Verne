import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import type { FsEntry, VerneFs } from "../src/fs.js";

/** Adaptador de node:fs para tests. Las apps inyectan el suyo (Tauri, OPFS…). */
export const nodeFs: VerneFs = {
  async exists(path) {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  },
  async mkdir(path) {
    await mkdir(path, { recursive: true });
  },
  readTextFile(path) {
    return readFile(path, "utf8");
  },
  async writeTextFile(path, contents) {
    await writeFile(path, contents, "utf8");
  },
  async readDir(path): Promise<FsEntry[]> {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.map((e) => ({ name: e.name, isDirectory: e.isDirectory() }));
  },
  async remove(path) {
    await rm(path, { recursive: true, force: true });
  },
  async rename(from, to) {
    await rename(from, to);
  },
};
