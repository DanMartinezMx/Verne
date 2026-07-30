import { BLUEPRINT_IDS, splitFrontmatter, getFrontmatterFields } from "@verne/core";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { collectionSchemaYaml, getBlueprint, listBlueprints } from "../src/index.js";

describe("definiciones de Blueprint", () => {
  for (const id of BLUEPRINT_IDS) {
    const bp = getBlueprint(id);
    describe(bp.label, () => {
      it("su id coincide con el del registro", () => {
        expect(bp.id).toBe(id);
      });

      it("tiene estados coherentes y estado inicial válido", () => {
        expect(bp.states.length).toBeGreaterThan(1);
        const ids = bp.states.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids).toContain(bp.initialState);
        for (const state of bp.states) {
          expect(state.color).toMatch(/^#[0-9a-f]{6}$/i);
        }
      });

      it("declara un acento para cada tema", () => {
        expect(bp.theme.accent).toMatch(/^#[0-9a-f]{6}$/i);
        expect(bp.theme.accentDark).toMatch(/^#[0-9a-f]{6}$/i);
      });

      it("ofrece al menos un perfil de exportación", () => {
        expect(bp.exportProfiles.length).toBeGreaterThan(0);
      });

      it("su documento inicial tiene frontmatter válido con estado conocido", () => {
        const parts = splitFrontmatter(bp.starterDocument.contents);
        expect(parts.frontmatterRaw).not.toBeNull();
        const fields = getFrontmatterFields(parts);
        expect(typeof fields["title"]).toBe("string");
        expect(bp.states.map((s) => s.id)).toContain(fields["estado"]);
      });

      it("sus plantillas tienen id único y frontmatter válido", () => {
        const ids = bp.templates.map((t) => t.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const template of bp.templates) {
          const parts = splitFrontmatter(template.contents);
          expect(parts.frontmatterRaw, `${template.id} sin frontmatter`).not.toBeNull();
          const fields = getFrontmatterFields(parts);
          expect(bp.states.map((s) => s.id)).toContain(fields["estado"]);
        }
      });

      // Es lo que evita que una plantilla del blog salga sin `description` o sin
      // `draft` y obligue a retocar la entrada a mano antes de publicarla.
      it("sus plantillas traen todos los campos obligatorios del espacio", () => {
        for (const template of bp.templates) {
          const fields = getFrontmatterFields(splitFrontmatter(template.contents));
          for (const meta of bp.metaFields.filter((f) => f.required)) {
            expect(Object.keys(fields), `${template.id} sin ${meta.key}`).toContain(meta.key);
          }
        }
      });

      it("su documento inicial también trae los campos obligatorios", () => {
        const fields = getFrontmatterFields(splitFrontmatter(bp.starterDocument.contents));
        for (const meta of bp.metaFields.filter((f) => f.required)) {
          expect(Object.keys(fields)).toContain(meta.key);
        }
      });

      it("sus campos de frontmatter tienen clave única y no pisan title ni estado", () => {
        const keys = bp.metaFields.map((f) => f.key);
        expect(new Set(keys).size).toBe(keys.length);
        expect(keys).not.toContain("title");
        expect(keys).not.toContain("estado");
      });

      it("su esquema de colección generado es YAML válido y cubre sus campos", () => {
        for (const collection of bp.collections) {
          const parsed = parse(collectionSchemaYaml(collection)) as {
            fields?: Record<string, unknown>;
          };
          expect(Object.keys(parsed.fields ?? {})).toEqual(collection.fields.map((f) => f.key));
          for (const field of collection.fields) {
            if (field.type === "enum") expect(field.values?.length).toBeGreaterThan(0);
            // `stampDateField` debe apuntar a un campo de fecha de la colección.
            if (field.stampDateField) {
              const target = collection.fields.find((f) => f.key === field.stampDateField);
              expect(target?.type).toBe("date");
            }
          }
        }
      });
    });
  }

  it("el espacio de cuentos define el registro de envíos", () => {
    const envios = getBlueprint("cuento").collections.find((c) => c.name === "envios");
    expect(envios).toBeDefined();
    expect(envios?.fields.find((f) => f.key === "respuesta")?.values).toContain("pendiente");
  });

  it("el blog habla el esquema de su sitio", () => {
    const bp = getBlueprint("blog");
    expect(bp.tagsField).toBe("categories");
    const draft = bp.metaFields.find((f) => f.key === "draft");
    expect(draft?.derivedFromState?.("publicada")).toBe(false);
    expect(draft?.derivedFromState?.("borrador")).toBe(true);
  });

  // D15: un tipo desconocido cae en el espacio de reserva en lugar de romper.
  it("un tipo desconocido resuelve al espacio de reserva, que no es creable", () => {
    const fallback = getBlueprint("novela-de-2032");
    expect(fallback.id).toBe("desconocido");
    expect(fallback.states.length).toBeGreaterThan(0);
    expect(listBlueprints().map((b) => b.id)).toEqual([...BLUEPRINT_IDS]);
  });
});
