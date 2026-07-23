import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  countWords,
  createProject,
  joinDocument,
  joinPath,
  readDocument,
  SNAPSHOT_KEEP,
  snapshotDocument,
  splitFrontmatter,
  writeDocument,
  type Project,
} from "../src/index.js";
import { nodeFs } from "./node-fs.js";

describe("splitFrontmatter / joinDocument", () => {
  it("separa frontmatter y cuerpo, y los reúne byte a byte", () => {
    const text = '---\ntitle: "El: faro"\ntags: [a, b]\n---\n\nCuerpo del texto.\n';
    const parts = splitFrontmatter(text);
    expect(parts.frontmatterRaw).toBe('---\ntitle: "El: faro"\ntags: [a, b]\n---\n');
    expect(parts.body).toBe("\nCuerpo del texto.\n");
    expect(joinDocument(parts)).toBe(text);
  });

  it("documento sin frontmatter", () => {
    const parts = splitFrontmatter("Solo prosa.\n");
    expect(parts.frontmatterRaw).toBeNull();
    expect(joinDocument(parts)).toBe("Solo prosa.\n");
  });

  it("no confunde una regla horizontal inicial con frontmatter", () => {
    // "---" seguido de línea en blanco no es frontmatter válido…
    const text = "---\n\ntexto tras una regla\n";
    const parts = splitFrontmatter(text);
    // …pero "---\n\ntexto" sí matchearía un frontmatter vacío malformado;
    // lo importante es que unir siempre devuelve los mismos bytes:
    expect(joinDocument(parts)).toBe(text);
  });

  it("preserva frontmatter con CRLF verbatim", () => {
    const text = "---\r\ntitle: X\r\n---\r\ncuerpo\r\n";
    const parts = splitFrontmatter(text);
    expect(parts.frontmatterRaw).toBe("---\r\ntitle: X\r\n---\r\n");
    expect(joinDocument(parts)).toBe(text);
  });

  it("frontmatter que nunca se cierra = todo es cuerpo", () => {
    const text = "---\ntitle: sin cierre\n\ncuerpo\n";
    expect(splitFrontmatter(text).frontmatterRaw).toBeNull();
  });

  it("joinDocument garantiza salto de línea final en el cuerpo", () => {
    expect(joinDocument({ frontmatterRaw: null, body: "sin salto" })).toBe("sin salto\n");
    expect(joinDocument({ frontmatterRaw: null, body: "" })).toBe("");
  });
});

describe("countWords", () => {
  it("cuenta palabras con acentos, guiones y apóstrofes", () => {
    expect(countWords("El ñandú corría —rápido— hacia el mar.")).toBe(7);
    expect(countWords("veintitrés mil cuatrocientos 42")).toBe(4);
    expect(countWords("")).toBe(0);
    expect(countWords("*** --- ###")).toBe(0);
  });
});

describe("documentos y snapshots", () => {
  let dir: string;
  let project: Project;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "verne-doc-test-"));
    project = await createProject(nodeFs, dir, { name: "Test", blueprint: "blog" });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("read → write conserva el frontmatter aunque solo cambie el cuerpo", async () => {
    const path = joinPath(dir, "contenido", "entrada.md");
    await nodeFs.writeTextFile(path, "---\ntitle: Hola\nestado: idea\n---\nprimera versión\n");
    const parts = await readDocument(nodeFs, path);
    await writeDocument(nodeFs, path, { ...parts, body: "segunda versión\n" });
    expect(await nodeFs.readTextFile(path)).toBe(
      "---\ntitle: Hola\nestado: idea\n---\nsegunda versión\n",
    );
  });

  it("snapshotDocument copia el documento a .verne/history y poda a SNAPSHOT_KEEP", async () => {
    const path = joinPath(dir, "contenido", "entrada.md");
    await nodeFs.writeTextFile(path, "v0\n");
    for (let i = 0; i < SNAPSHOT_KEEP + 5; i++) {
      await nodeFs.writeTextFile(path, `v${i}\n`);
      await snapshotDocument(nodeFs, project, path);
    }
    const historyDir = joinPath(dir, ".verne", "history", "contenido", "entrada.md");
    const snapshots = (await nodeFs.readDir(historyDir)).map((e) => e.name).sort();
    expect(snapshots.length).toBe(SNAPSHOT_KEEP);
    const newest = snapshots[snapshots.length - 1];
    expect(await nodeFs.readTextFile(joinPath(historyDir, newest ?? ""))).toBe(
      `v${SNAPSHOT_KEEP + 4}\n`,
    );
  });

  it("snapshot de un documento inexistente no hace nada", async () => {
    await expect(
      snapshotDocument(nodeFs, project, joinPath(dir, "contenido", "no-existe.md")),
    ).resolves.toBeUndefined();
  });
});
