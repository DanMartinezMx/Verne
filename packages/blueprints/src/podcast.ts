import type { BlueprintDef } from "./types.js";

export const podcastBlueprint: BlueprintDef = {
  id: "podcast",
  label: "Podcast",
  vocabulary: {
    documentSingular: "episodio",
    documentPlural: "Episodios",
    newDocumentPlaceholder: "Nuevo episodio…",
  },
  states: [
    { id: "idea", label: "Idea", color: "#f59e0b" },
    { id: "guion", label: "Guion", color: "#6b7280" },
    { id: "grabado", label: "Grabado", color: "#3b82f6" },
    { id: "editado", label: "Editado", color: "#06b6d4" },
    { id: "publicado", label: "Publicado", color: "#10b981" },
  ],
  initialState: "idea",
  theme: { accent: "#db2777", accentDark: "#f472b6", editorFont: "sans" },
  exportProfiles: ["cms"],
  collections: [],
  metaFields: [
    { key: "invitado", label: "Invitado", type: "text" },
    { key: "duracion", label: "Duración", type: "text", placeholder: "38:12" },
    { key: "publicado", label: "Publicado", type: "date" },
  ],
  templates: [
    {
      id: "episodio",
      label: "Guion de episodio",
      contents: `---
title: {{title}}
estado: idea
---

## Apertura

Gancho de 30 segundos.

## Bloque 1

## Cierre

Resumen, llamada a la acción, despedida.
`,
    },
    {
      id: "notas-del-programa",
      label: "Notas del programa",
      contents: `---
title: {{title}}
estado: idea
---

## Resumen

## Enlaces mencionados

-

## Créditos
`,
    },
  ],
  starterDocument: {
    fileName: "episodio-001.md",
    contents: `---
title: "Episodio 1: el comienzo"
estado: idea
---

## Apertura

Bienvenida, de qué va el episodio, gancho de 30 segundos.

## Bloque 1

Tema principal. Notas, datos y preguntas que no quieres olvidar al aire.

## Cierre

Resumen, llamada a la acción, despedida.

---

Notas de producción: música, invitados, enlaces para la descripción.
`,
  },
};
