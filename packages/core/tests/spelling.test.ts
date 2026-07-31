import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  addCustomWords,
  analyzeSpelling,
  createProject,
  createSpeller,
  DICTIONARY_FILE,
  findMisspellings,
  joinPath,
  listUnknownWords,
  parseCustomWords,
  readCustomWords,
  type Project,
  type Speller,
} from "../src/index.js";
import { nodeFs } from "./node-fs.js";

/**
 * Se usa el diccionario de español de verdad: un corrector con un diccionario de
 * juguete no prueba nada de lo que puede salir mal (RFC-0004 §3).
 */
let speller: Speller;

beforeAll(async () => {
  // El mismo diccionario que empaqueta la app, no una copia: un solo origen.
  const base = new URL("../../../apps/desktop/public/diccionarios/es/", import.meta.url);
  const [aff, dic] = await Promise.all([
    readFile(new URL("index.aff", base), "utf8"),
    readFile(new URL("index.dic", base), "utf8"),
  ]);
  speller = createSpeller({ aff, dic }, ["Amelia"]);
}, 30_000);

describe("ortografía: lo que NO debe marcar", () => {
  /**
   * El riesgo número uno de RFC-0004: en español el diálogo se marca con raya, y
   * sin recortarla la primera palabra de cada línea sería una falta. Una novela
   * son miles de líneas de diálogo.
   */
  it("no marca la raya de diálogo pegada a la palabra", () => {
    const dialogo = "—Otra vez llegas tarde —dijo Amelia, sin volverse.";
    expect(findMisspellings(dialogo, speller)).toEqual([]);
  });

  it("no marca palabras entre comillas latinas, inglesas ni interrogación", () => {
    for (const texto of ['«faro»', '"faro"', "'faro'", "¿faro?", "¡faro!", "(faro)", "faro…"]) {
      expect(findMisspellings(texto, speller), texto).toEqual([]);
    }
  });

  it("no marca lo que no es prosa", () => {
    const texto = "Mira https://ejemplo.mx y el `codigoRaro` del año 2026, o correo@ejemplo.mx";
    expect(findMisspellings(texto, speller)).toEqual([]);
  });

  it("acepta la morfología del español, incluidos los enclíticos", () => {
    const texto =
      "Cuéntamelo mientras desayunábamos, mirándola y volviéndose para dárselo al murciélago.";
    expect(findMisspellings(texto, speller)).toEqual([]);
  });

  it("acepta las palabras del proyecto", () => {
    // "Amelia" se pasó a createSpeller; sin ella saldría marcada.
    expect(findMisspellings("Amelia volvió al faro.", speller)).toEqual([]);
  });
});

describe("ortografía: lo que SÍ debe marcar", () => {
  it("encuentra la falta con su posición exacta", () => {
    const texto = "El murcielago dormía.";
    const found = findMisspellings(texto, speller);
    expect(found).toHaveLength(1);
    expect(found[0]!.word).toBe("murcielago");
    expect(texto.slice(found[0]!.from, found[0]!.to)).toBe("murcielago");
  });

  it("da la posición correcta aunque la palabra lleve signos alrededor", () => {
    const texto = "—¿Murcielago? —repitió.";
    const found = findMisspellings(texto, speller);
    expect(found).toHaveLength(1);
    expect(texto.slice(found[0]!.from, found[0]!.to)).toBe("Murcielago");
  });

  it("sugiere la corrección en la explicación del subrayado", () => {
    const [finding] = analyzeSpelling("El murcielago dormía.", speller);
    expect(finding!.category).toBe("ortografia");
    expect(finding!.message).toContain("murcielago");
    expect(finding!.why).toContain("murciélago");
  });

  it("agrupa y cuenta las desconocidas para el panel, la más repetida primero", () => {
    const texto = "Jessy y Connie. Jessy otra vez. Jessy y murcielago.";
    const unknown = listUnknownWords(texto, speller);
    expect(unknown.map((u) => [u.word, u.count])).toEqual([
      ["Jessy", 3],
      ["Connie", 1],
      ["murcielago", 1],
    ]);
    expect(unknown.find((u) => u.word === "murcielago")?.suggestions).toContain("murciélago");
  });
});

describe("diccionario del proyecto", () => {
  let dir: string;
  let project: Project;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "verne-dicc-"));
    project = await createProject(nodeFs, dir, { name: "La novela", blueprint: "novela" });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("sin archivo, no falla: lista vacía", async () => {
    expect(await readCustomWords(nodeFs, project)).toEqual([]);
  });

  it("añade palabras, las ordena y no repite", async () => {
    await addCustomWords(nodeFs, project, ["Jessy", "Amelia"]);
    const all = await addCustomWords(nodeFs, project, ["Connie", "Amelia"]);
    expect(all).toEqual(["Amelia", "Connie", "Jessy"]);
    expect(await readCustomWords(nodeFs, project)).toEqual(["Amelia", "Connie", "Jessy"]);
  });

  /** Vive en la raíz porque `.verne/` es prescindible (RFC-0004 §5). */
  it("vive en la raíz del proyecto, no en .verne/", async () => {
    await addCustomWords(nodeFs, project, ["Amelia"]);
    expect(await nodeFs.exists(joinPath(dir, DICTIONARY_FILE))).toBe(true);
    // La prueba de fuego del VPF: borrar .verne/ no se lleva las palabras.
    await nodeFs.remove(joinPath(dir, ".verne"));
    expect(await readCustomWords(nodeFs, project)).toEqual(["Amelia"]);
  });

  it("es un archivo que una persona puede editar a mano", () => {
    const text = "# Personajes\nAmelia\n\n  Jessy  \n# Lugares\nel Faro\nAmelia\n";
    expect(parseCustomWords(text)).toEqual(["Amelia", "Jessy", "el Faro"]);
  });

  it("el archivo que escribe se puede volver a leer con sus comentarios", async () => {
    await addCustomWords(nodeFs, project, ["Amelia"]);
    const raw = await nodeFs.readTextFile(joinPath(dir, DICTIONARY_FILE));
    expect(raw).toContain("#");
    expect(parseCustomWords(raw)).toEqual(["Amelia"]);
  });
});
