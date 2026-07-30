import { applyTemplate, BLUEPRINT_IDS, splitFrontmatter, getFrontmatterFields } from "@verne/core";
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

      /**
       * Los marcadores van entre comillas para que la plantilla sea YAML válido
       * ANTES de sustituir nada: `createdAt: {{fecha}}` se parsea como un mapa
       * anidado, no como texto, y cualquier herramienta que abra el archivo ve
       * basura.
       */
      it("sus plantillas son YAML válido sin sustituir, con los marcadores citados", () => {
        for (const template of bp.templates) {
          const fields = getFrontmatterFields(splitFrontmatter(template.contents));
          for (const [key, value] of Object.entries(fields)) {
            expect(
              typeof value === "object" && value !== null && !Array.isArray(value),
              `${template.id}: ${key} no es un escalar — ¿falta citar un {{marcador}}?`,
            ).toBe(false);
          }
        }
      });

      it("una plantilla aplicada sigue siendo YAML válido y no deja marcadores", () => {
        for (const template of bp.templates) {
          const applied = applyTemplate(template.contents, {
            // Un título hostil: dos puntos, comillas y acentos.
            title: 'Episodio 1: "el faro" — así',
            now: new Date("2026-06-24T23:40:52.966Z"),
          });
          expect(applied).not.toContain("{{");
          const fields = getFrontmatterFields(splitFrontmatter(applied));
          expect(fields["title"], `${template.id}`).toBe('Episodio 1: "el faro" — así');
        }
      });

      it("sus plantillas solo usan claves que el espacio declara", () => {
        const declared = new Set([...bp.metaFields.map((f) => f.key), "title", "estado"]);
        for (const template of bp.templates) {
          const fields = getFrontmatterFields(splitFrontmatter(template.contents));
          for (const key of Object.keys(fields)) {
            // Una clave que la cabecera no sabe editar solo se podría cambiar
            // abriendo el .md en otro editor.
            expect(declared, `${template.id} usa ${key}, que no está en metaFields`).toContain(key);
          }
        }
      });

      it("los campos de lista con opciones cerradas ofrecen alguna", () => {
        for (const field of bp.metaFields) {
          if (field.options) {
            expect(field.type).toBe("list");
            expect(field.options.length).toBeGreaterThan(0);
          }
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

  /**
   * Refleja las reglas de `scripts/validate-content.mjs` del sitio destino, que
   * corre en su `prebuild`: si estas fallan, publicar rompe su build.
   */
  describe("el blog cumple el validador de su sitio", () => {
    const bp = getBlueprint("blog");

    it("exporta con la extensión que el sitio renderiza", () => {
      // El validador del sitio rechaza .md en duro: nunca se renderizaría.
      expect(bp.cmsExtension).toBe("mdx");
    });

    it("las categorías son una lista cerrada, así que no se puede inventar una", () => {
      const categories = bp.metaFields.find((f) => f.key === "categories");
      expect(categories?.options).toContain("Cine y TV");
      expect(categories?.options).toContain("Personal");
      expect(bp.tagsField).toBe("categories");
    });

    it("toda plantilla trae título y una fecha válida, que es lo que el sitio exige", () => {
      for (const template of [...bp.templates, { id: "starter", contents: bp.starterDocument.contents }]) {
        const fields = getFrontmatterFields(splitFrontmatter(template.contents));
        expect(Object.keys(fields), `${template.id} sin title`).toContain("title");
        expect(Object.keys(fields), `${template.id} sin createdAt`).toContain("createdAt");
        const createdAt = String(fields["createdAt"]);
        // `{{fecha}}` se sustituye por un ISO al crear; el resto debe ser fecha ya.
        if (!createdAt.includes("{{")) {
          expect(Number.isNaN(new Date(createdAt).getTime()), `${template.id}`).toBe(false);
        }
      }
    });

    it("ninguna plantilla trae una categoría que el sitio no conozca", () => {
      const allowed = bp.metaFields.find((f) => f.key === "categories")?.options ?? [];
      for (const template of [...bp.templates, { id: "starter", contents: bp.starterDocument.contents }]) {
        const fields = getFrontmatterFields(splitFrontmatter(template.contents));
        const used = Array.isArray(fields["categories"]) ? fields["categories"].map(String) : [];
        for (const category of used) {
          expect(allowed, `${template.id} usa la categoría ${category}`).toContain(category);
        }
      }
    });

    it("draft se deriva del estado: publicar deja draft en false", () => {
      const draft = bp.metaFields.find((f) => f.key === "draft");
      expect(draft?.derivedFromState?.("publicada")).toBe(false);
      expect(draft?.derivedFromState?.("borrador")).toBe(true);
      expect(draft?.derivedFromState?.("idea")).toBe(true);
    });
  });

  /** RFC-0003 §3: un solo espacio novela, parametrizado por meta de palabras. */
  describe("el espacio novela", () => {
    const bp = getBlueprint("novela");

    it("es UNA obra larga, así que declara manuscrito", () => {
      expect(bp.manuscript).toBeDefined();
      expect(bp.manuscript?.defaultTarget).toBeGreaterThan(0);
    });

    it("ofrece novela corta y completa como formas del mismo espacio, no como tipos", () => {
      const shapes = bp.manuscript?.shapes ?? [];
      expect(shapes.length).toBeGreaterThan(1);
      const ids = shapes.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const shape of shapes) {
        expect(shape.target).toBeGreaterThan(0);
        expect(shape.scaffold.length).toBeGreaterThan(0);
      }
      // La corta tiene menos meta que la completa: si no, no serían distintas.
      const corta = shapes.find((s) => s.id === "corta");
      const larga = shapes.find((s) => s.id === "larga");
      expect(corta!.target).toBeLessThan(larga!.target);
      // Y no hay un espacio "novela-corta": es el mismo con otra meta.
      expect(BLUEPRINT_IDS as readonly string[]).not.toContain("novela-corta");
    });

    it("tiene las fichas que una novela necesita y el blog no", () => {
      expect(bp.collections.map((c) => c.name)).toEqual([
        "personajes",
        "localizaciones",
        "tramas",
      ]);
      expect(getBlueprint("blog").collections).toEqual([]);
      // Y el blog no es una obra larga: nada de compilar entradas en un libro.
      expect(getBlueprint("blog").manuscript).toBeUndefined();
    });

    it("se lee en serif, no en la tipografía de un blog", () => {
      expect(bp.theme.editorFont).toBe("serif");
    });
  });

  // D15: un tipo desconocido cae en el espacio de reserva en lugar de romper.
  it("un tipo desconocido resuelve al espacio de reserva, que no es creable", () => {
    const fallback = getBlueprint("novela-de-2032");
    expect(fallback.id).toBe("desconocido");
    expect(fallback.states.length).toBeGreaterThan(0);
    expect(listBlueprints().map((b) => b.id)).toEqual([...BLUEPRINT_IDS]);
  });
});
