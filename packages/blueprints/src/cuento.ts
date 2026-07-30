import type { BlueprintDef } from "./types.js";

export const cuentoBlueprint: BlueprintDef = {
  id: "cuento",
  label: "Cuentos",
  vocabulary: {
    documentSingular: "cuento",
    documentPlural: "Cuentos",
    newDocumentPlaceholder: "Nuevo cuento…",
  },
  states: [
    { id: "idea", label: "Idea", color: "#f59e0b" },
    { id: "borrador", label: "Borrador", color: "#6b7280" },
    { id: "revision", label: "Revisión", color: "#3b82f6" },
    { id: "terminado", label: "Terminado", color: "#10b981" },
    { id: "enviado", label: "Enviado", color: "#8b5cf6" },
  ],
  initialState: "idea",
  theme: { accent: "#8b5cf6", accentDark: "#a78bfa", editorFont: "serif" },
  exportProfiles: ["manuscrito-docx"],
  metaFields: [],
  // El registro de envíos: la ficha que todo cuentista lleva en una hoja de
  // cálculo. Antes era un campo propio del Blueprint (`submissions`); ahora es
  // lo que siempre fue, una colección más (RFC-0003 §2).
  collections: [
    {
      name: "envios",
      label: "Envíos",
      description: "Colección de envíos: a qué mercado se envió cada cuento y qué respondieron.",
      fields: [
        { key: "cuento", label: "Cuento", type: "document" },
        { key: "mercado", label: "Mercado (revista, concurso, antología)", type: "string" },
        { key: "fechaEnvio", label: "Fecha de envío", type: "date" },
        {
          key: "respuesta",
          label: "Respuesta",
          type: "enum",
          values: ["pendiente", "aceptado", "rechazado", "retirado"],
          stampDateField: "fechaRespuesta",
        },
        { key: "fechaRespuesta", label: "Fecha de respuesta", type: "date" },
      ],
    },
  ],
  templates: [
    {
      id: "cuento",
      label: "Cuento",
      contents: `---
title: {{title}}
estado: idea
---

`,
    },
    {
      id: "sinopsis-de-envio",
      label: "Sinopsis para enviar",
      contents: `---
title: {{title}}
estado: idea
---

## Sinopsis (una página)

## Nota de presentación

Breve, sin adjetivos sobre tu propio texto: título, número de palabras, dos o
tres publicaciones previas si las hay, y gracias.

## Mercados a los que encaja
`,
    },
  ],
  starterDocument: {
    fileName: "mi-primer-cuento.md",
    contents: `---
title: Mi primer cuento
estado: idea
---

Había una vez un archivo Markdown normal, dentro de la carpeta
\`contenido/\` de tu proyecto, esperando a que lo escribieras.
`,
  },
};
