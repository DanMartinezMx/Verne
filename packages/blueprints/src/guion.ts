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
el personaje que habla y cita (\`>\`) para el diálogo y las acotaciones. El formato
profesional de guion (Fountain, Final Draft) llegará como exportador.
`,
  },
};
