import { collectionSchemaYaml, getBlueprint } from "@verne/blueprints";
import {
  addCollectionEntry,
  createProject,
  ensureCollection,
  joinPath,
  seedTemplates,
  writeDocument,
  CONTENT_DIR,
  type BlueprintId,
  type VerneFs,
} from "@verne/core";

/** Raíz de la biblioteca de demo. */
export const PREVIEW_LIBRARY = "/Verne";

/**
 * Siembra una biblioteca de demo para la previsualización en navegador. Usa las
 * mismas funciones que la app de verdad (`createProject`, `seedTemplates`,
 * `ensureCollection`), así que lo que se ve es el comportamiento real y no una
 * maqueta.
 */
export async function seedPreviewLibrary(fs: VerneFs): Promise<void> {
  await fs.mkdir(PREVIEW_LIBRARY);

  await space(fs, "mi-blog", "Mi blog", "blog", async (dir) => {
    await writeDocument(fs, joinPath(dir, CONTENT_DIR, "el-faro-y-la-carta.md"), {
      frontmatterRaw: `---
title: El faro y la carta
description: "Sobre las películas que se atreven a no explicar su final."
categories:
  - Cine y TV
createdAt: 2026-06-24T23:40:52.966Z
image: /uploads/faro.jpg
draft: false
estado: publicada
---
`,
      body: `Hay un tipo de película que confía en quien la ve. No te explica el final:
te lo deja en las manos y se va.

## Lo que no se dice

El silencio de un plano largo hace más que tres líneas de diálogo. Muy
frecuentemente los guiones actuales no confían en el espectador, y realmente
eso se nota bastante en el resultado final.
`,
    });
  });

  await space(fs, "cuentos", "Cuentos", "cuento", async (dir) => {
    await writeDocument(fs, joinPath(dir, CONTENT_DIR, "el-faro.md"), {
      frontmatterRaw: "---\ntitle: El faro\nestado: enviado\n---\n",
      body: `La luz del faro entraba y salía de la habitación como una respiración
lenta. Amelia contaba los segundos entre destello y destello.
`,
    });
  });

  // Un envío ya registrado, para que la tabla de fichas no aparezca vacía.
  const cuentos = { dir: joinPath(PREVIEW_LIBRARY, "cuentos"), manifest: manifestOf("Cuentos", "cuento") };
  await addCollectionEntry(fs, cuentos, "envios", "el-faro-revista-ejemplo", {
    cuento: "contenido/el-faro.md",
    mercado: "Revista Ejemplo",
    fechaEnvio: "2026-05-02",
    respuesta: "pendiente",
  });
}

/** Crea un espacio con su andamio, sus plantillas y sus colecciones. */
async function space(
  fs: VerneFs,
  folder: string,
  name: string,
  blueprint: BlueprintId,
  fill: (dir: string) => Promise<void>,
): Promise<void> {
  const dir = joinPath(PREVIEW_LIBRARY, folder);
  const bp = getBlueprint(blueprint);
  const project = await createProject(fs, dir, {
    name,
    blueprint,
    starterDocument: bp.starterDocument,
    ...(bp.scaffold ? { scaffold: bp.scaffold } : {}),
  });
  await seedTemplates(fs, project, bp.templates);
  for (const collection of bp.collections) {
    await ensureCollection(fs, project, collection.name, collectionSchemaYaml(collection));
  }
  await fill(dir);
}

function manifestOf(name: string, blueprint: string) {
  return { vpf: "0.1", name, blueprint, language: "es", createdAt: "2026-01-01T00:00:00.000Z" };
}
