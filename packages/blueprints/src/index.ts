import type { BlueprintId } from "@verne/core";
import { blogBlueprint } from "./blog.js";
import { cuentoBlueprint } from "./cuento.js";
import { diarioBlueprint } from "./diario.js";
import { guionBlueprint } from "./guion.js";
import { podcastBlueprint } from "./podcast.js";
import type { BlueprintDef } from "./types.js";

export { blogBlueprint } from "./blog.js";
export { cuentoBlueprint } from "./cuento.js";
export { diarioBlueprint } from "./diario.js";
export { guionBlueprint } from "./guion.js";
export { podcastBlueprint } from "./podcast.js";
export type { BlueprintDef, WorkflowState } from "./types.js";

const BLUEPRINTS: Record<BlueprintId, BlueprintDef> = {
  blog: blogBlueprint,
  cuento: cuentoBlueprint,
  guion: guionBlueprint,
  podcast: podcastBlueprint,
  diario: diarioBlueprint,
};

export function getBlueprint(id: BlueprintId): BlueprintDef {
  return BLUEPRINTS[id];
}

export function listBlueprints(): BlueprintDef[] {
  return Object.values(BLUEPRINTS);
}
