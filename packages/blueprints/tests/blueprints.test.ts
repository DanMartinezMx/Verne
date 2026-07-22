import { BLUEPRINT_IDS, splitFrontmatter, getFrontmatterFields } from "@verne/core";
import { describe, expect, it } from "vitest";
import { getBlueprint } from "../src/index.js";

describe("definiciones de Blueprint", () => {
  for (const id of BLUEPRINT_IDS) {
    const bp = getBlueprint(id);
    describe(bp.label, () => {
      it("tiene estados coherentes y estado inicial válido", () => {
        expect(bp.states.length).toBeGreaterThan(1);
        const ids = bp.states.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids).toContain(bp.initialState);
        for (const state of bp.states) {
          expect(state.color).toMatch(/^#[0-9a-f]{6}$/i);
        }
      });

      it("su documento inicial tiene frontmatter válido con estado conocido", () => {
        const parts = splitFrontmatter(bp.starterDocument.contents);
        expect(parts.frontmatterRaw).not.toBeNull();
        const fields = getFrontmatterFields(parts);
        expect(typeof fields["title"]).toBe("string");
        expect(bp.states.map((s) => s.id)).toContain(fields["estado"]);
      });
    });
  }

  it("el blueprint de cuentos define el registro de envíos", () => {
    const bp = getBlueprint("cuento");
    expect(bp.submissions?.collection).toBe("envios");
    expect(bp.submissions?.responses.map((r) => r.id)).toContain("pendiente");
  });
});
