import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createProject, INTERNAL_DIR, joinPath, listSpaces } from "../src/index.js";
import { nodeFs } from "./node-fs.js";

let library: string;

beforeEach(async () => {
  library = await mkdtemp(join(tmpdir(), "verne-biblioteca-"));
});

afterEach(async () => {
  await rm(library, { recursive: true, force: true });
});

describe("biblioteca de espacios (RFC-0003 §6)", () => {
  it("encuentra los espacios de la carpeta y los ordena por nombre", async () => {
    await createProject(nodeFs, joinPath(library, "la-novela"), {
      name: "El faro de Amelia",
      blueprint: "novela",
    });
    await createProject(nodeFs, joinPath(library, "mi-blog"), { name: "Mi blog", blueprint: "blog" });
    await createProject(nodeFs, joinPath(library, "cuentos"), { name: "Cuentos", blueprint: "cuento" });

    const spaces = await listSpaces(nodeFs, library);
    expect(spaces.map((s) => s.manifest.name)).toEqual(["Cuentos", "El faro de Amelia", "Mi blog"]);
    expect(spaces.map((s) => s.manifest.blueprint)).toEqual(["cuento", "novela", "blog"]);
    expect(spaces.find((s) => s.folder === "la-novela")?.dir).toBe(joinPath(library, "la-novela"));
  });

  it("ignora sin ruido lo que no es un espacio", async () => {
    await createProject(nodeFs, joinPath(library, "mi-blog"), { name: "Mi blog", blueprint: "blog" });
    // Una carpeta cualquiera de la carpeta de escritura de alguien.
    await nodeFs.mkdir(joinPath(library, "fotos-de-la-boda"));
    await nodeFs.writeTextFile(joinPath(library, "notas.txt"), "suelto");
    await nodeFs.mkdir(joinPath(library, ".oculta"));

    expect((await listSpaces(nodeFs, library)).map((s) => s.folder)).toEqual(["mi-blog"]);
  });

  it("un verne.yaml roto no impide ver los demás espacios", async () => {
    await createProject(nodeFs, joinPath(library, "bueno"), { name: "Bueno", blueprint: "blog" });
    await nodeFs.mkdir(joinPath(library, "roto"));
    await nodeFs.writeTextFile(joinPath(library, "roto", "verne.yaml"), "no: soy: válido:\n  - [\n");

    expect((await listSpaces(nodeFs, library)).map((s) => s.folder)).toEqual(["bueno"]);
  });

  // Listar no debe tener efectos secundarios: es solo mirar.
  it("listar no crea nada en el disco", async () => {
    const dir = joinPath(library, "mi-blog");
    await createProject(nodeFs, dir, { name: "Mi blog", blueprint: "blog" });
    await nodeFs.remove(joinPath(dir, INTERNAL_DIR));

    await listSpaces(nodeFs, library);

    expect(await nodeFs.exists(joinPath(dir, INTERNAL_DIR))).toBe(false);
  });

  it("una biblioteca que no existe da lista vacía, no un error", async () => {
    expect(await listSpaces(nodeFs, joinPath(library, "no-existe"))).toEqual([]);
  });

  // Varias novelas se organizan en una carpeta: cada una sigue siendo su propio
  // espacio, con sus fichas y su meta, y la biblioteca las agrupa.
  it("encuentra espacios dentro de carpetas y dice a qué grupo pertenecen", async () => {
    await createProject(nodeFs, joinPath(library, "novelas", "el-faro"), {
      name: "El faro de Amelia",
      blueprint: "novela",
    });
    await createProject(nodeFs, joinPath(library, "novelas", "la-segunda"), {
      name: "La segunda",
      blueprint: "novela",
    });
    await createProject(nodeFs, joinPath(library, "mi-blog"), { name: "Mi blog", blueprint: "blog" });

    const spaces = await listSpaces(nodeFs, library);
    expect(spaces.map((s) => [s.group, s.manifest.name])).toEqual([
      ["", "Mi blog"],
      ["novelas", "El faro de Amelia"],
      ["novelas", "La segunda"],
    ]);
  });

  it("no baja dentro de un espacio: un proyecto nunca contiene otro", async () => {
    const dir = joinPath(library, "mi-blog");
    await createProject(nodeFs, dir, { name: "Mi blog", blueprint: "blog" });
    // Un verne.yaml perdido dentro del contenido no debe aparecer como espacio.
    await nodeFs.mkdir(joinPath(dir, "contenido", "raro"));
    await nodeFs.writeTextFile(
      joinPath(dir, "contenido", "raro", "verne.yaml"),
      "vpf: '0.2'\nname: Colado\nblueprint: blog\n",
    );

    expect((await listSpaces(nodeFs, library)).map((s) => s.manifest.name)).toEqual(["Mi blog"]);
  });

  it("no se pierde recorriendo un árbol profundo", async () => {
    await createProject(nodeFs, joinPath(library, "a", "b", "c", "d", "muy-hondo"), {
      name: "Muy hondo",
      blueprint: "blog",
    });
    // Más allá del límite de profundidad, simplemente no se encuentra.
    expect(await listSpaces(nodeFs, library)).toEqual([]);
  });
});
