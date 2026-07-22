import type { BlueprintDef } from "./types.js";

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
  starterDocument: {
    fileName: "mi-primera-entrada.md",
    contents: `---
title: Mi primera entrada
estado: idea
---

Escribe aquí. Esta entrada es tuya: es un archivo Markdown normal dentro de la
carpeta \`contenido/\` de tu proyecto.
`,
  },
};
