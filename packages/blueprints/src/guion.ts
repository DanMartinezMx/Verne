import type { BlueprintDef } from "./types.js";

export const guionBlueprint: BlueprintDef = {
  id: "guion",
  label: "Guion",
  vocabulary: {
    documentSingular: "guion",
    documentPlural: "Guiones",
    newDocumentPlaceholder: "Nuevo guion…",
  },
  states: [
    { id: "idea", label: "Idea", color: "#f59e0b" },
    { id: "escaleta", label: "Escaleta", color: "#06b6d4" },
    { id: "borrador", label: "Borrador", color: "#6b7280" },
    { id: "revision", label: "Revisión", color: "#3b82f6" },
    { id: "terminado", label: "Terminado", color: "#10b981" },
  ],
  initialState: "idea",
  // Monoespaciada: es la convención del formato, y hace que las escenas se lean
  // como se leen en un guion de verdad.
  theme: { accent: "#0891b2", accentDark: "#22d3ee", editorFont: "mono" },
  exportProfiles: ["manuscrito-docx"],
  sceneHeadings: true,
  metaFields: [],
  collections: [
    {
      name: "personajes",
      label: "Personajes",
      description: "Quién es quién: lo mínimo para no contradecirte en la escena 40.",
      fields: [
        { key: "nombre", label: "Nombre", type: "string" },
        { key: "quiere", label: "Qué quiere", type: "string" },
        { key: "teme", label: "Qué teme", type: "string" },
      ],
    },
  ],
  templates: [
    {
      id: "escena",
      label: "Escena",
      contents: `---
title: "{{title}}"
estado: idea
---

## INT. LUGAR — DÍA

Acción.

**PERSONAJE**

> Diálogo.
`,
    },
    {
      id: "escaleta",
      label: "Escaleta de secuencia",
      contents: `---
title: "{{title}}"
estado: escaleta
---

| # | Escena | Qué pasa | Qué cambia |
|---|---|---|---|
| 1 | INT. — DÍA |  |  |
| 2 |  |  |  |
`,
    },
  ],
  starterDocument: {
    fileName: "mi-primer-guion.md",
    contents: `---
title: Mi primer guion
estado: idea
---

## INT. CASA DE AMELIA — NOCHE

Amelia mira por la ventana. La luz del faro entra y sale de la habitación.

**AMELIA**

> (sin volverse)
> Otra vez llegas tarde.

Convención sugerida: encabezados \`##\` para las escenas (INT./EXT.), negrita para
el personaje que habla y cita (\`>\`) para el diálogo y las acotaciones. Escribe
\`INT. \` o \`EXT. \` al principio de una línea y Verne la convierte en escena. El
formato profesional de guion (Fountain, Final Draft) llegará como exportador.
`,
  },
};
