import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createFolder,
  createProject,
  joinPath,
  listSnapshots,
  moveEntry,
  renameEntry,
  sanitizeName,
  snapshotDocument,
  VerneError,
  type Project,
} from "../src/index.js";
import { nodeFs } from "./node-fs.js";

let dir: string;
let project: Project;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "verne-organize-test-"));
  project = await createProject(nodeFs, dir, { name: "Test", blueprint: "blog" });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const content = (...parts: string[]) => joinPath(dir, "contenido", ...parts);

describe("sanitizeName", () => {
  it("quita separadores y reservados, conserva espacios, guiones y acentos", () => {
    expect(sanitizeName("Capítulo 1: el/faro")).toBe("Capítulo 1 elfaro");
    expect(sanitizeName("  espacios   raros  ")).toBe("espacios raros");
    expect(sanitizeName("....")).toBe("");
    expect(sanitizeName("nombre-con-guiones")).toBe("nombre-con-guiones");
  });
});

describe("createFolder", () => {
  it("crea una carpeta en contenido/ y evita colisiones", async () => {
    const a = await createFolder(nodeFs, project, "Capítulos");
    expect(a).toBe(content("Capítulos"));
    expect(await nodeFs.exists(a)).toBe(true);
    const b = await createFolder(nodeFs, project, "Capítulos");
    expect(b).toBe(content("Capítulos-2"));
  });

  it("rechaza nombres vacíos y destinos fuera de contenido/", async () => {
    await expect(createFolder(nodeFs, project, "   ")).rejects.toBeInstanceOf(VerneError);
    await expect(
      createFolder(nodeFs, project, "x", joinPath(dir, ".verne")),
    ).rejects.toBeInstanceOf(VerneError);
  });
});

describe("renameEntry", () => {
  it("renombra un documento conservando .md y su historial", async () => {
    const path = content("borrador.md");
    await nodeFs.writeTextFile(path, "una versión con historia\n");
    await snapshotDocument(nodeFs, project, path);

    const renamed = await renameEntry(nodeFs, project, path, "El faro definitivo");
    expect(renamed).toBe(content("El faro definitivo.md"));
    expect(await nodeFs.exists(path)).toBe(false);
    // el historial viajó con el documento
    const snaps = await listSnapshots(nodeFs, project, renamed);
    expect(snaps.length).toBe(1);
  });

  it("renombra una carpeta y arrastra el historial de sus documentos", async () => {
    const folder = await createFolder(nodeFs, project, "cap");
    const doc = joinPath(folder, "uno.md");
    await nodeFs.writeTextFile(doc, "contenido del capítulo uno\n");
    await snapshotDocument(nodeFs, project, doc);

    const renamedFolder = await renameEntry(nodeFs, project, folder, "capítulos");
    const movedDoc = joinPath(renamedFolder, "uno.md");
    expect(await nodeFs.exists(movedDoc)).toBe(true);
    expect((await listSnapshots(nodeFs, project, movedDoc)).length).toBe(1);
  });

  it("no pisa un nombre ya ocupado", async () => {
    await nodeFs.writeTextFile(content("a.md"), "a\n");
    await nodeFs.writeTextFile(content("b.md"), "b\n");
    const renamed = await renameEntry(nodeFs, project, content("b.md"), "a");
    expect(renamed).toBe(content("a-2.md"));
  });
});

describe("moveEntry", () => {
  it("mueve un documento a una carpeta y conserva su historial", async () => {
    const folder = await createFolder(nodeFs, project, "archivo");
    const doc = content("suelto.md");
    await nodeFs.writeTextFile(doc, "documento que se muda\n");
    await snapshotDocument(nodeFs, project, doc);

    const moved = await moveEntry(nodeFs, project, doc, folder);
    expect(moved).toBe(joinPath(folder, "suelto.md"));
    expect(await nodeFs.exists(doc)).toBe(false);
    expect((await listSnapshots(nodeFs, project, moved)).length).toBe(1);
  });

  it("mover al mismo sitio no hace nada", async () => {
    const doc = content("quieto.md");
    await nodeFs.writeTextFile(doc, "no me muevo\n");
    const same = await moveEntry(nodeFs, project, doc, content());
    expect(same).toBe(doc);
  });

  it("impide mover una carpeta dentro de sí misma", async () => {
    const folder = await createFolder(nodeFs, project, "padre");
    await expect(moveEntry(nodeFs, project, folder, folder)).rejects.toBeInstanceOf(VerneError);
    const child = await createFolder(nodeFs, project, "hijo", folder);
    await expect(moveEntry(nodeFs, project, folder, child)).rejects.toBeInstanceOf(VerneError);
  });
});
