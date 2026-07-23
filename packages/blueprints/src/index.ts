import type { BlueprintId } from "@verne/core";
import { blogBlueprint } from "./blog.js";
import { cuentoBlueprint } from "./cuento.js";
import type { BlueprintDef } from "./types.js";

export { blogBlueprint } from "./blog.js";
export { cuentoBlueprint } from "./cuento.js";
export type { BlueprintDef, WorkflowState } from "./types.js";

const BLUEPRINTS: Record<BlueprintId, BlueprintDef> = {
  blog: blogBlueprint,
  cuento: cuentoBlueprint,
};

export function getBlueprint(id: BlueprintId): BlueprintDef {
  return BLUEPRINTS[id];
}
