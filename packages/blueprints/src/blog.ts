import type { BlueprintDef } from "./types.js";

/**
 * Categorías con las que NACE un proyecto de blog: una sugerencia, no una ley.
 *
 * Se copian a `options.categories` de su `verne.yaml` al crear el espacio y a
 * partir de ahí son del proyecto: cada quien añade y quita las suyas, desde la
 * cabecera del documento o editando el archivo. Estas son las del blog del
 * maintainer porque de algo hay que partir.
 *
 * Lo que importa no es la lista, es que sea CERRADA dentro de cada proyecto: un
 * generador de sitios que valida categorías (como el del maintainer) falla el
 * build ante una mal escrita, y marcar de una lista hace imposible escribirla mal.
 */
export const BLOG_CATEGORIES = [
  "Tech",
  "Coding",
  "Gaming",
  "Foodies",
  "Cine y TV",
  "Cuentos",
  "Literatura",
  "Viajes",
  "Personal",
  "Random",
  "Recomendaciones",
  "Connie",
] as const;

/**
 * Espacio Blog: su frontmatter es el que exige el sitio del maintainer
 * (RFC-0003 §5), tomado de su esquema de TinaCMS y de su validador de contenido.
 *
 * `estado` se queda además de `draft` porque la app necesita tres estados para
 * sus filtros y colores, y un booleano no los da. Es inerte para el sitio.
 */
export const blogBlueprint: BlueprintDef = {
  id: "blog",
  label: "Blog",
  vocabulary: {
    documentSingular: "entrada",
    documentPlural: "Entradas",
    newDocumentPlaceholder: "Nueva entrada…",
  },
  states: [
    { id: "idea", label: "Idea", color: "#f59e0b" },
    { id: "borrador", label: "Borrador", color: "#6b7280" },
    { id: "publicada", label: "Publicada", color: "#10b981" },
  ],
  initialState: "idea",
  theme: { accent: "#4f46e5", accentDark: "#818cf8", editorFont: "sans" },
  exportProfiles: ["cms"],
  // El sitio solo renderiza .mdx y su validador rechaza .md en duro.
  cmsExtension: "mdx",
  collections: [],
  tagsField: "categories",
  metaFields: [
    {
      key: "description",
      label: "Descripción",
      type: "textarea",
      placeholder: "Una o dos frases; es lo que se lee en buscadores y redes",
    },
    { key: "categories", label: "Categorías", type: "list", options: BLOG_CATEGORIES },
    { key: "createdAt", label: "Creada", type: "date", autoOnCreate: true },
    { key: "updatedAt", label: "Actualizada", type: "date" },
    { key: "image", label: "Portada", type: "text", placeholder: "/uploads/foto.jpg" },
    {
      key: "slug",
      label: "URL (slug)",
      type: "text",
      placeholder: "manda sobre el nombre del archivo",
    },
    { key: "series", label: "Serie", type: "text", placeholder: "Proyecto Verne" },
    { key: "seriesOrder", label: "Nº en la serie", type: "number" },
    {
      key: "draft",
      label: "Borrador en el sitio",
      type: "boolean",
      derivedFromState: (estado) => estado !== "publicada",
    },
  ],
  templates: [
    {
      id: "entrada",
      label: "Entrada",
      contents: `---
title: "{{title}}"
description: ""
categories: []
createdAt: "{{fecha}}"
draft: true
estado: idea
---

`,
    },
    {
      id: "resena",
      label: "Reseña de cine o TV",
      contents: `---
title: "{{title}}"
description: ""
categories:
  - Cine y TV
createdAt: "{{fecha}}"
draft: true
estado: idea
---

## De qué va

## Qué funciona

## Qué no

## ¿Vale la pena?
`,
    },
    {
      // El microblog del sitio es otra colección con otro esquema: solo pide
      // título y fecha, y su cuerpo no admite bloques MDX.
      id: "microblog",
      label: "Nota de microblog",
      contents: `---
title: "{{title}}"
createdAt: "{{fecha}}"
estado: idea
---

`,
    },
  ],
  starterDocument: {
    fileName: "mi-primera-entrada.md",
    contents: `---
title: Mi primera entrada
description: "La entrada que Verne crea para que veas cómo queda una."
categories:
  - Personal
createdAt: 2026-01-01T00:00:00.000Z
draft: true
estado: idea
---

Escribe aquí. Esta entrada es tuya: es un archivo Markdown normal dentro de la
carpeta \`contenido/\` de tu proyecto.

El frontmatter de arriba es el que espera tu sitio. Las categorías se marcan de
una lista cerrada, así que no puedes escribir una que rompa el build; y cuando
pases el estado a «Publicada», \`draft\` se pondrá en \`false\` solo.

Al exportar, «Guardar .mdx» te da el archivo listo para copiarlo a
\`content/posts/\` de tu blog.
`,
  },
};
