import { type VerneFs } from "@verne/core";

/**
 * `VerneFs` en memoria, solo para previsualizar la UI en un navegador sin
 * instalar la cadena de Rust (ni Tauri). NO forma parte de la app: `host.ts` lo
 * usa únicamente cuando corre fuera de Tauri y en modo desarrollo.
 *
 * Es posible porque core nunca toca el disco: recibe un adaptador
 * (packages/core/src/fs.ts). Aquí se ve que la costura funciona.
 *
 * ponytail: en memoria en lugar de sobre la File System Access API. Esa habría
 * exigido mapear rutas a handles y emular `rename` copiando, solo funciona en
 * Chrome, y para mirar la interfaz no aporta nada. Estos son archivos de
 * mentira, y el código dice que lo son.
 */
export function createMemoryFs(): VerneFs {
  const files = new Map<string, string>();
  const binaries = new Map<string, Uint8Array>();
  const dirs = new Set<string>(["/"]);

  const clean = (path: string): string => path.replace(/\/+$/, "") || "/";
  const parentOf = (path: string): string => clean(path).slice(0, clean(path).lastIndexOf("/")) || "/";

  function mkdirp(path: string): void {
    let current = clean(path);
    while (current !== "/" && !dirs.has(current)) {
      dirs.add(current);
      current = parentOf(current);
    }
  }

  /** Nombres directamente dentro de `dir` (un solo nivel). */
  function childrenOf(dir: string): { name: string; isDirectory: boolean }[] {
    const prefix = clean(dir) === "/" ? "/" : `${clean(dir)}/`;
    const seen = new Map<string, boolean>();
    for (const path of dirs) {
      if (path !== "/" && path.startsWith(prefix) && !path.slice(prefix.length).includes("/")) {
        seen.set(path.slice(prefix.length), true);
      }
    }
    for (const path of [...files.keys(), ...binaries.keys()]) {
      if (path.startsWith(prefix) && !path.slice(prefix.length).includes("/")) {
        seen.set(path.slice(prefix.length), false);
      }
    }
    return [...seen].map(([name, isDirectory]) => ({ name, isDirectory }));
  }

  return {
    exists: (path) =>
      Promise.resolve(files.has(clean(path)) || binaries.has(clean(path)) || dirs.has(clean(path))),

    mkdir: (path) => {
      mkdirp(path);
      return Promise.resolve();
    },

    readTextFile: (path) => {
      const contents = files.get(clean(path));
      if (contents === undefined) return Promise.reject(new Error(`No existe: ${path}`));
      return Promise.resolve(contents);
    },

    writeTextFile: (path, contents) => {
      mkdirp(parentOf(path));
      files.set(clean(path), contents);
      return Promise.resolve();
    },

    writeBinaryFile: (path, contents) => {
      mkdirp(parentOf(path));
      binaries.set(clean(path), contents);
      return Promise.resolve();
    },

    readDir: (path) => {
      if (!dirs.has(clean(path))) return Promise.reject(new Error(`No existe: ${path}`));
      return Promise.resolve(childrenOf(path));
    },

    remove: (path) => {
      const target = clean(path);
      const prefix = `${target}/`;
      for (const key of [...files.keys()]) {
        if (key === target || key.startsWith(prefix)) files.delete(key);
      }
      for (const key of [...binaries.keys()]) {
        if (key === target || key.startsWith(prefix)) binaries.delete(key);
      }
      for (const key of [...dirs]) {
        if (key === target || key.startsWith(prefix)) dirs.delete(key);
      }
      return Promise.resolve();
    },

    rename: (from, to) => {
      const source = clean(from);
      const target = clean(to);
      const prefix = `${source}/`;
      mkdirp(parentOf(target));
      const move = <T>(map: Map<string, T>) => {
        for (const [key, value] of [...map]) {
          if (key === source) {
            map.delete(key);
            map.set(target, value);
          } else if (key.startsWith(prefix)) {
            map.delete(key);
            map.set(target + key.slice(source.length), value);
          }
        }
      };
      move(files);
      move(binaries);
      for (const key of [...dirs]) {
        if (key === source) {
          dirs.delete(key);
          dirs.add(target);
        } else if (key.startsWith(prefix)) {
          dirs.delete(key);
          dirs.add(target + key.slice(source.length));
        }
      }
      return Promise.resolve();
    },
  };
}
