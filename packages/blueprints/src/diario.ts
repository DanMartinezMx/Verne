import type { BlueprintDef } from "./types.js";

export const diarioBlueprint: BlueprintDef = {
  id: "diario",
  label: "Diario",
  vocabulary: {
    documentSingular: "entrada",
    documentPlural: "Entradas",
    newDocumentPlaceholder: "Hoy…",
  },
  states: [
    { id: "entrada", label: "Entrada", color: "#6b7280" },
    { id: "destacada", label: "Destacada", color: "#f59e0b" },
  ],
  initialState: "entrada",
  naming: "fecha",
  theme: { accent: "#65a30d", accentDark: "#a3e635", editorFont: "serif" },
  exportProfiles: ["manuscrito-docx"],
  collections: [],
  metaFields: [],
  templates: [
    {
      id: "entrada",
      label: "Entrada libre",
      contents: `---
title: "{{title}}"
estado: entrada
---

`,
    },
    {
      id: "entrada-con-preguntas",
      label: "Entrada con preguntas",
      contents: `---
title: "{{title}}"
estado: entrada
---

## Qué pasó hoy

## Qué me llevo

## Qué dejo aquí
`,
    },
  ],
  starterDocument: {
    fileName: "bienvenida.md",
    contents: `---
title: Bienvenida a tu diario
estado: entrada
---

Este diario es tuyo y de nadie más: vive en tu equipo, en archivos de texto que
puedes leer dentro de veinte años con cualquier programa.

Pulsa el botón «+» y Verne creará la entrada de hoy con la fecha como título.
Escribe sin pensar en el formato — aquí no hay estados que gestionar ni nada que
publicar. Marca como «Destacada» la entrada que quieras reencontrar fácilmente.
`,
  },
};
