import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CONTENT_DIR,
  createProject,
  INTERNAL_DIR,
  joinPath,
  openProject,
  parseManifest,
  readProjectTree,
  VerneError,
  VPF_VERSION,
} from "../src/index.js";
import { nodeFs } from "./node-fs.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "verne-test-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("createProject / openProject", () => {
  it("crea un proyecto y lo vuelve a abrir con el mismo manifiesto", async () => {
    const created = await createProject(nodeFs, dir, { name: "Mi blog", blueprint: "blog" });
    expect(created.manifest.vpf).toBe(VPF_VERSION);

    const opened = await openProject(nodeFs, dir);
    expect(opened.manifest.name).toBe("Mi blog");
    expect(opened.manifest.blueprint).toBe("blog");
    expect(opened.manifest.language).toBe("es");
    expect(opened.manifest.createdAt).not.toBe("");
  });

  it("rechaza crear encima de un proyecto existente", async () => {
    await createProject(nodeFs, dir, { name: "Uno", blueprint: "cuento" });
    await expect(createProject(nodeFs, dir, { name: "Dos", blueprint: "blog" })).rejects.toThrow(
      VerneError,
    );
  });

  it("rechaza abrir una carpeta que no es un proyecto, con error claro", async () => {
    const error = await openProject(nodeFs, dir).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(VerneError);
    expect((error as VerneError).code).toBe("NOT_A_PROJECT");
  });

  it("rechaza un manifiesto de una versión mayor de VPF desconocida", () => {
    expect(() => parseManifest("vpf: '99.0'\nname: X\nblueprint: blog\n")).toThrow(
      /VPF 99\.0/,
    );
  });
});

describe("readProjectTree", () => {
  it("lee carpetas y documentos .md anidados, ordenados y sin ocultos", async () => {
    const project = await createProject(nodeFs, dir, { name: "Cuentos", blueprint: "cuento" });
    const content = joinPath(dir, CONTENT_DIR);
    await nodeFs.mkdir(joinPath(content, "02-terminados"));
    await nodeFs.mkdir(joinPath(content, "01-en-curso"));
    await nodeFs.writeTextFile(joinPath(content, "01-en-curso", "el-faro.md"), "# El faro");
    await nodeFs.writeTextFile(joinPath(content, "notas.md"), "notas");
    await nodeFs.writeTextFile(joinPath(content, ".oculto.md"), "no debe salir");
    await nodeFs.writeTextFile(joinPath(content, "imagen.png"), "binario");

    const tree = await readProjectTree(nodeFs, project);
    expect(tree.map((n) => `${n.kind}:${n.name}`)).toEqual([
      "folder:01-en-curso",
      "folder:02-terminados",
      "document:mi-primer-cuento",
      "document:notas",
    ]);
    expect(tree[0]?.children?.map((n) => n.name)).toEqual(["el-faro"]);
  });
});

describe("la prueba de fuego del VPF (RFC-0001 §6.2)", () => {
  it("borrar .verne/ entero no pierde contenido ni manifiesto, y se regenera", async () => {
    const project = await createProject(nodeFs, dir, { name: "Mi blog", blueprint: "blog" });
    const before = await readProjectTree(nodeFs, project);

    await nodeFs.remove(joinPath(dir, INTERNAL_DIR));
    expect(await nodeFs.exists(joinPath(dir, INTERNAL_DIR))).toBe(false);

    const reopened = await openProject(nodeFs, dir);
    expect(reopened.manifest.name).toBe("Mi blog");
    expect(await readProjectTree(nodeFs, reopened)).toEqual(before);
    expect(await nodeFs.exists(joinPath(dir, INTERNAL_DIR))).toBe(true);
  });
});
