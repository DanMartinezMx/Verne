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
