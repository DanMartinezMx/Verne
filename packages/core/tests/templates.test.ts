import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyTemplate,
  createProject,
  getFrontmatterFields,
  joinPath,
  splitFrontmatter,
  listTemplates,
  seedTemplates,
  stampSaveDates,
  TEMPLATES_DIR,
  type Project,
} from "../src/index.js";
import { nodeFs } from "./node-fs.js";

let dir: string;
let project: Project;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "verne-plantillas-"));
  project = await createProject(nodeFs, dir, { name: "Mi blog", blueprint: "blog" });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const SEEDS = [
  {
    id: "entrada",
    label: "Entrada",
    contents: '---\ntitle: "{{title}}"\ncreatedAt: "{{fecha}}"\n---\n\n',
  },
  { id: "nota", label: "Nota", contents: '---\ntitle: "{{title}}"\n---\n\nCuerpo.\n' },
];

describe("plantillas (RFC-0003 §4)", () => {
  it("siembra las plantillas del espacio y las lista con su etiqueta", async () => {
    await seedTemplates(nodeFs, project, SEEDS);
    const templates = await listTemplates(nodeFs, project);
    expect(templates.map((t) => t.id).sort()).toEqual(["entrada", "nota"]);
    // El título de la plantilla trae `{{title}}` sin sustituir, así que la
    // etiqueta cae al nombre del archivo en lugar de mostrar la variable.
    expect(templates.every((t) => !t.label.includes("{{"))).toBe(true);
  });

  // La garantía de RFC-0003 §4: una plantilla editada es del usuario.
  it("no sobrescribe una plantilla que el usuario ya editó", async () => {
    await seedTemplates(nodeFs, project, SEEDS);
    const path = joinPath(project.dir, TEMPLATES_DIR, "entrada.md");
    await nodeFs.writeTextFile(path, "---\ntitle: Mía\n---\n\nLa escribí yo.\n");

    await seedTemplates(nodeFs, project, SEEDS);

    expect(await nodeFs.readTextFile(path)).toContain("La escribí yo.");
    expect((await listTemplates(nodeFs, project)).find((t) => t.id === "entrada")?.label).toBe("Mía");
  });

  it("recoge una plantilla nueva escrita a mano en la carpeta", async () => {
    await seedTemplates(nodeFs, project, SEEDS);
    await nodeFs.writeTextFile(
      joinPath(project.dir, TEMPLATES_DIR, "resena.md"),
      "---\ntitle: Reseña\n---\n\n## De qué va\n",
    );
    expect((await listTemplates(nodeFs, project)).map((t) => t.id)).toContain("resena");
  });

  it("ignora lo que no es una plantilla", async () => {
    await seedTemplates(nodeFs, project, SEEDS);
    const dirPath = joinPath(project.dir, TEMPLATES_DIR);
    await nodeFs.writeTextFile(joinPath(dirPath, "_notas.md"), "no soy plantilla");
    await nodeFs.writeTextFile(joinPath(dirPath, "leeme.txt"), "tampoco");
    await nodeFs.mkdir(joinPath(dirPath, "subcarpeta"));
    expect((await listTemplates(nodeFs, project)).map((t) => t.id).sort()).toEqual([
      "entrada",
      "nota",
    ]);
  });

  it("sustituye title y fecha, y no deja variables sin resolver", () => {
    const now = new Date("2026-06-24T23:40:52.966Z");
    const applied = applyTemplate(SEEDS[0]!.contents, { title: "El faro", now });
    const fields = getFrontmatterFields(splitFrontmatter(applied));
    expect(fields["title"]).toBe("El faro");
    expect(fields["createdAt"]).toBe("2026-06-24T23:40:52.966Z");
    expect(applied).not.toContain("{{");
  });

  // Un título con dos puntos o comillas rompería el frontmatter si se insertara
  // en crudo dentro de las comillas de la plantilla.
  it("escapa el título para que quepa dentro de las comillas de la plantilla", () => {
    const applied = applyTemplate('---\ntitle: "{{title}}"\n---\n', {
      title: 'Episodio 1: "el faro"',
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(getFrontmatterFields(splitFrontmatter(applied))["title"]).toBe(
      'Episodio 1: "el faro"',
    );
  });

  // La plantilla debe poder abrirse y parsearse antes de sustituir nada.
  it("la plantilla sin sustituir ya es YAML válido", () => {
    const fields = getFrontmatterFields(splitFrontmatter(SEEDS[0]!.contents));
    expect(fields["title"]).toBe("{{title}}");
    expect(fields["createdAt"]).toBe("{{fecha}}");
  });

  it("sin carpeta de plantillas, no falla: devuelve lista vacía", async () => {
    expect(await listTemplates(nodeFs, project)).toEqual([]);
  });
});

/**
 * La fecha de modificación que espera un generador de sitios. Guardar es
 * automático y cada pocos segundos, así que sellar el instante en cada guardado
 * dejaría un `updatedAt` distinto por pulsación.
 */
describe("fechas de modificación al guardar", () => {
  const parts = (updatedAt?: string) => ({
    frontmatterRaw: `---\ntitle: Entrada\n${updatedAt ? `updatedAt: "${updatedAt}"\n` : ""}---\n`,
    body: "Cuerpo.\n",
  });

  it("sella la fecha cuando el campo no existe", () => {
    const now = new Date("2026-08-01T10:00:00.000Z");
    const result = stampSaveDates(parts(), ["updatedAt"], now);
    expect(getFrontmatterFields(result)["updatedAt"]).toBe("2026-08-01T10:00:00.000Z");
  });

  it("la refresca si ya pasó el intervalo", () => {
    const now = new Date("2026-08-01T10:05:00.000Z");
    const result = stampSaveDates(parts("2026-08-01T10:00:00.000Z"), ["updatedAt"], now);
    expect(getFrontmatterFields(result)["updatedAt"]).toBe("2026-08-01T10:05:00.000Z");
  });

  /** Lo que evita el ruido: dentro del intervalo, el archivo no se toca. */
  it("no toca nada dentro del intervalo, y preserva el frontmatter byte a byte", () => {
    const original = parts("2026-08-01T10:00:00.000Z");
    const now = new Date("2026-08-01T10:00:30.000Z");
    const result = stampSaveDates(original, ["updatedAt"], now);
    expect(result).toBe(original);
    expect(result.frontmatterRaw).toBe(original.frontmatterRaw);
  });

  it("sin campos que sellar, devuelve las partes tal cual", () => {
    const original = parts("2026-08-01T10:00:00.000Z");
    expect(stampSaveDates(original, [], new Date("2027-01-01T00:00:00.000Z"))).toBe(original);
  });

  it("una fecha ilegible se considera caducada y se corrige", () => {
    const now = new Date("2026-08-01T10:00:00.000Z");
    const result = stampSaveDates(parts("ayer por la tarde"), ["updatedAt"], now);
    expect(getFrontmatterFields(result)["updatedAt"]).toBe("2026-08-01T10:00:00.000Z");
  });

  it("no toca los demás campos del frontmatter", () => {
    const result = stampSaveDates(parts(), ["updatedAt"], new Date("2026-08-01T10:00:00.000Z"));
    expect(getFrontmatterFields(result)["title"]).toBe("Entrada");
    expect(result.body).toBe("Cuerpo.\n");
  });
});
