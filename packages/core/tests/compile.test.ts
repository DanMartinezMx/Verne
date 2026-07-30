import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  compileManuscript,
  CONTENT_DIR,
  createProject,
  joinPath,
  writeDocument,
  type Project,
} from "../src/index.js";
import { nodeFs } from "./node-fs.js";

let dir: string;
let project: Project;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "verne-compile-"));
  project = await createProject(nodeFs, dir, { name: "La novela", blueprint: "novela" });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function chapter(relative: string, title: string, body: string): Promise<void> {
  const path = joinPath(dir, CONTENT_DIR, relative);
  // writeDocument no crea carpetas padre a propósito: en la app los documentos
  // nacen en carpetas que ya existen.
  await nodeFs.mkdir(path.slice(0, path.lastIndexOf("/")));
  await writeDocument(nodeFs, path, {
    frontmatterRaw: `---\ntitle: ${title}\nestado: borrador\n---\n`,
    body,
  });
}

describe("compileManuscript (RFC-0003 §3)", () => {
  it("junta los capítulos en el orden del árbol, con los números bien", async () => {
    // El orden natural del explorador: 2 va antes de 10, no después.
    await chapter("10-decimo.md", "Décimo", "Diez.");
    await chapter("02-segundo.md", "Segundo", "Dos.");
    await chapter("01-primero.md", "Primero", "Uno.");

    const compiled = await compileManuscript(nodeFs, project);
    expect(compiled.parts.map((p) => p.title)).toEqual(["Primero", "Segundo", "Décimo"]);
    expect(compiled.markdown.indexOf("Uno.")).toBeLessThan(compiled.markdown.indexOf("Dos."));
    expect(compiled.markdown.indexOf("Dos.")).toBeLessThan(compiled.markdown.indexOf("Diez."));
  });

  it("respeta las partes: carpetas primero y capítulos dentro de cada una", async () => {
    await chapter("01-parte-uno/01-el-faro.md", "El faro", "Cuerpo A.");
    await chapter("01-parte-uno/02-la-carta.md", "La carta", "Cuerpo B.");
    await chapter("02-parte-dos/01-el-regreso.md", "El regreso", "Cuerpo C.");

    const compiled = await compileManuscript(nodeFs, project);
    expect(compiled.parts.map((p) => p.title)).toEqual([
      "01-parte-uno",
      "El faro",
      "La carta",
      "02-parte-dos",
      "El regreso",
    ]);
    // La profundidad da el nivel del encabezado: parte con #, capítulo con ##.
    expect(compiled.markdown).toContain("# 01-parte-uno");
    expect(compiled.markdown).toContain("## El faro");
  });

  it("suma las palabras de la obra, sin contar los títulos", async () => {
    await chapter("01.md", "Uno", "una dos tres");
    await chapter("02.md", "Dos", "cuatro cinco");
    const compiled = await compileManuscript(nodeFs, project);
    expect(compiled.words).toBe(5);
    expect(compiled.parts.map((p) => p.words)).toEqual([3, 2]);
  });

  it("usa el nombre del archivo cuando el capítulo no tiene título", async () => {
    await writeDocument(nodeFs, joinPath(dir, CONTENT_DIR, "sin-titulo.md"), {
      frontmatterRaw: null,
      body: "Cuerpo suelto.",
    });
    const compiled = await compileManuscript(nodeFs, project);
    expect(compiled.parts[0]?.title).toBe("sin-titulo");
  });

  it("un capítulo vacío no deja líneas en blanco de más", async () => {
    await chapter("01.md", "Vacío", "");
    await chapter("02.md", "Lleno", "Algo.");
    const compiled = await compileManuscript(nodeFs, project);
    expect(compiled.markdown).toBe("# Vacío\n\n# Lleno\n\nAlgo.\n");
  });

  it("un proyecto sin contenido compila a vacío en lugar de fallar", async () => {
    const compiled = await compileManuscript(nodeFs, project);
    expect(compiled.markdown).toBe("");
    expect(compiled.words).toBe(0);
  });
});
