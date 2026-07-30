import type { BlueprintDef } from "./types.js";

/**
 * Frontmatter del blog: calca el esquema que espera el sitio del maintainer
 * (RFC-0003 §5). El objetivo es que publicar sea copiar el archivo al repo del
 * sitio, sin un solo retoque a mano.
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
  collections: [],
  tagsField: "categories",
  metaFields: [
    {
      key: "description",
      label: "Descripción",
      type: "textarea",
      required: true,
      placeholder: "Una o dos frases; es lo que se lee en buscadores y redes",
    },
    { key: "categories", label: "Categorías", type: "list", required: true },
    { key: "createdAt", label: "Creada", type: "date", required: true, autoOnCreate: true },
    // Opcional en el sitio: se añade cuando la entrada tiene imagen.
    { key: "image", label: "Imagen", type: "text", placeholder: "/uploads/foto.jpg" },
    {
      key: "draft",
      label: "Borrador en el sitio",
      type: "boolean",
      required: true,
      derivedFromState: (estado) => estado !== "publicada",
    },
  ],
  templates: [
    {
      id: "entrada",
      label: "Entrada",
      contents: `---
title: {{title}}
description: ""
categories: []
createdAt: {{fecha}}
draft: true
estado: idea
---

`,
    },
    {
      id: "resena",
      label: "Reseña de cine o TV",
      contents: `---
title: {{title}}
description: ""
categories:
  - Cine y TV
createdAt: {{fecha}}
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
      id: "nota-rapida",
      label: "Nota rápida",
      contents: `---
title: {{title}}
description: ""
categories: []
createdAt: {{fecha}}
draft: true
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
categories: []
createdAt: 2026-01-01T00:00:00.000Z
draft: true
estado: idea
---

Escribe aquí. Esta entrada es tuya: es un archivo Markdown normal dentro de la
carpeta \`contenido/\` de tu proyecto.

El frontmatter de arriba es el que espera tu sitio. Rellena la descripción y las
categorías desde la cabecera del documento; cuando pases el estado a «Publicada»,
\`draft\` se pondrá en \`false\` solo.
`,
  },
};
