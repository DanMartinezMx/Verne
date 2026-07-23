import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addCollectionEntry,
  createProject,
  getFrontmatterFields,
  joinPath,
  listCollection,
  listTrash,
  readProjectDocuments,
  readTags,
  restoreDocument,
  searchProject,
  splitFrontmatter,
  trashDocument,
  updateCollectionEntry,
  withFrontmatterFields,
  type Project,
} from "../src/index.js";
import { nodeFs } from "./node-fs.js";

let dir: string;
let project: Project;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "verne-org-test-"));
  project = await createProject(nodeFs, dir, { name: "Test", blueprint: "cuento" });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("frontmatter estructurado", () => {
  it("edita campos preservando comentarios y campos desconocidos", () => {
    const parts = splitFrontmatter(
      "---\n# mi comentario\ntitle: El faro\ncampoRaro: 42\nestado: idea\n---\ncuerpo\n",
    );
    const updated = withFrontmatterFields(parts, { estado: "borrador", tags: ["mar"] });
    expect(updated.frontmatterRaw).toContain("# mi comentario");
    expect(updated.frontmatterRaw).toContain("campoRaro: 42");
    expect(updated.frontmatterRaw).toContain("estado: borrador");
    expect(updated.body).toBe("cuerpo\n");
    const fields = getFrontmatterFields(updated);
    expect(fields["estado"]).toBe("borrador");
    expect(readTags(fields)).toEqual(["mar"]);
  });

  it("crea frontmatter donde no lo había y lo elimina si queda vacío", () => {
    const created = withFrontmatterFields({ frontmatterRaw: null, body: "hola\n" }, {
      estado: "idea",
    });
    expect(created.frontmatterRaw).toBe("---\nestado: idea\n---\n");
    const emptied = withFrontmatterFields(created, { estado: undefined });
    expect(emptied.frontmatterRaw).toBeNull();
  });
});

describe("índice de documentos", () => {
  it("lee título, estado, etiquetas y palabras de todos los documentos", async () => {
    await nodeFs.writeTextFile(
      joinPath(dir, "contenido", "el-faro.md"),
      "---\ntitle: El faro\nestado: borrador\ntags: [mar, faros]\n---\nuna dos tres cuatro\n",
    );
    await nodeFs.writeTextFile(joinPath(dir, "contenido", "sin-meta.md"), "solo cuerpo\n");
    const docs = await readProjectDocuments(nodeFs, project);
    expect(docs.map((d) => d.title).sort()).toEqual(["El faro", "sin-meta"]);
    const faro = docs.find((d) => d.title === "El faro");
    expect(faro?.estado).toBe("borrador");
    expect(faro?.tags).toEqual(["mar", "faros"]);
    expect(faro?.words).toBe(4);
    expect(docs.find((d) => d.title === "sin-meta")?.estado).toBeNull();
  });
});

describe("búsqueda global", () => {
  it("encuentra por cuerpo, título y etiquetas, sin acentos", async () => {
    await nodeFs.writeTextFile(
      joinPath(dir, "contenido", "cafe.md"),
      "---\ntitle: Sobre el café\ntags: [gastronomía]\n---\nEl café de la esquina abría al alba.\n",
    );
    await nodeFs.writeTextFile(joinPath(dir, "contenido", "otro.md"), "Nada que ver.\n");

    const porCuerpo = await searchProject(nodeFs, project, "CAFE");
    expect(porCuerpo.map((r) => r.name)).toEqual(["cafe"]);
    expect(porCuerpo[0]?.snippet).toContain("café de la esquina");

    const porTag = await searchProject(nodeFs, project, "gastronomia");
    expect(porTag.length).toBe(1);

    expect(await searchProject(nodeFs, project, "inexistente")).toEqual([]);
    expect(await searchProject(nodeFs, project, "   ")).toEqual([]);
  });
});

describe("papelera", () => {
  it("borrar mueve a papelera/ y restaurar devuelve sin pisar", async () => {
    const path = joinPath(dir, "contenido", "borrame.md");
    await nodeFs.writeTextFile(path, "contenido valioso\n");
    await trashDocument(nodeFs, project, path);
    expect(await nodeFs.exists(path)).toBe(false);

    const trash = await listTrash(nodeFs, project);
    expect(trash.length).toBe(1);
    expect(trash[0]?.name).toBe("borrame");
    expect(trash[0]?.deletedAt).not.toBeNull();

    // un archivo nuevo ocupa el nombre original: restaurar no debe pisarlo
    await nodeFs.writeTextFile(path, "otro nuevo\n");
    const restored = await restoreDocument(nodeFs, project, trash[0]?.path ?? "");
    expect(restored.endsWith("borrame-2.md")).toBe(true);
    expect(await nodeFs.readTextFile(restored)).toBe("contenido valioso\n");
    expect(await listTrash(nodeFs, project)).toEqual([]);
  });
});

describe("colecciones", () => {
  it("añade, lista y actualiza fichas con campos", async () => {
    const path = await addCollectionEntry(nodeFs, project, "envios", "el-faro-revista-x", {
      cuento: "contenido/el-faro.md",
      mercado: "Revista X",
      fechaEnvio: "2026-07-22",
      respuesta: "pendiente",
    });
    expect(path).toContain("colecciones/envios/");

    let entries = await listCollection(nodeFs, project, "envios");
    expect(entries.length).toBe(1);
    expect(entries[0]?.fields["mercado"]).toBe("Revista X");

    await updateCollectionEntry(nodeFs, path, {
      respuesta: "aceptado",
      fechaRespuesta: "2026-09-01",
    });
    entries = await listCollection(nodeFs, project, "envios");
    expect(entries[0]?.fields["respuesta"]).toBe("aceptado");
    expect(entries[0]?.fields["fechaRespuesta"]).toBe("2026-09-01");

    // slugs duplicados no se pisan
    const second = await addCollectionEntry(nodeFs, project, "envios", "el-faro-revista-x", {
      mercado: "Revista X",
    });
    expect(second.endsWith("el-faro-revista-x-2.md")).toBe(true);
    expect((await listCollection(nodeFs, project, "envios")).length).toBe(2);
  });
});
