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
  submissions: {
    collection: "envios",
    schemaYaml: `# Colección de envíos: a qué mercado se envió cada cuento y qué respondieron.
fields:
  cuento: { type: string, label: Cuento }
  mercado: { type: string, label: Mercado (revista, concurso, antología) }
  fechaEnvio: { type: date, label: Fecha de envío }
  respuesta: { type: string, label: Respuesta }
  fechaRespuesta: { type: date, label: Fecha de respuesta }
`,
    responses: [
      { id: "pendiente", label: "Pendiente" },
      { id: "aceptado", label: "Aceptado" },
      { id: "rechazado", label: "Rechazado" },
      { id: "retirado", label: "Retirado" },
    ],
  },
};
