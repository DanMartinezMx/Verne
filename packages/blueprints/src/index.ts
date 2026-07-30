import { BLUEPRINT_IDS, type BlueprintId } from "@verne/core";
import { blogBlueprint } from "./blog.js";
import { cuentoBlueprint } from "./cuento.js";
import { desconocidoBlueprint } from "./desconocido.js";
import { diarioBlueprint } from "./diario.js";
import { guionBlueprint } from "./guion.js";
import { novelaBlueprint } from "./novela.js";
import { podcastBlueprint } from "./podcast.js";
import type { BlueprintDef } from "./types.js";

export { blogBlueprint } from "./blog.js";
export { cuentoBlueprint } from "./cuento.js";
export { desconocidoBlueprint } from "./desconocido.js";
export { diarioBlueprint } from "./diario.js";
export { guionBlueprint } from "./guion.js";
export { novelaBlueprint } from "./novela.js";
export { podcastBlueprint } from "./podcast.js";
export { collectionSchemaYaml } from "./schema.js";
export type {
  BlueprintDef,
  CollectionDef,
  CollectionFieldDef,
  ExportProfileId,
  MetaFieldDef,
  SpaceTheme,
  TemplateDef,
  WorkflowState,
} from "./types.js";

const BLUEPRINTS: Record<BlueprintId, BlueprintDef> = {
  blog: blogBlueprint,
  cuento: cuentoBlueprint,
  novela: novelaBlueprint,
  guion: guionBlueprint,
  podcast: podcastBlueprint,
  diario: diarioBlueprint,
};

/**
 * Resuelve la definición de un espacio. Acepta cualquier cadena porque el
 * manifiesto ya no rechaza tipos desconocidos (RFC-0003 §7.1): un proyecto
 * creado por una versión futura de Verne se abre con el espacio de reserva en
 * lugar de no abrirse.
 */
export function getBlueprint(id: string): BlueprintDef {
  return BLUEPRINTS[id as BlueprintId] ?? desconocidoBlueprint;
}

/** Los espacios que el usuario puede crear (el de reserva no está). */
export function listBlueprints(): BlueprintDef[] {
  return BLUEPRINT_IDS.map((id) => BLUEPRINTS[id]);
}
