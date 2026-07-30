import type { BlueprintDef } from "./types.js";

/**
 * Espacio de reserva para un `blueprint` que esta versión de Verne no conoce
 * (RFC-0003 §7.1, D15): un proyecto creado por una versión futura se abre y se
 * lee en lugar de no abrirse. Da lo universal —escribir, estados genéricos,
 * historial, papelera— y nada específico.
 *
 * No aparece en `listBlueprints()`: no se puede crear, solo se cae en él.
 */
export const desconocidoBlueprint: BlueprintDef = {
  id: "desconocido",
  label: "Espacio",
  vocabulary: {
    documentSingular: "documento",
    documentPlural: "Documentos",
    newDocumentPlaceholder: "Nuevo documento…",
  },
  states: [
    { id: "borrador", label: "Borrador", color: "#6b7280" },
    { id: "terminado", label: "Terminado", color: "#10b981" },
  ],
  initialState: "borrador",
  theme: { accent: "#6b7280", accentDark: "#9ca3af", editorFont: "sans" },
  exportProfiles: ["manuscrito-docx"],
  collections: [],
  metaFields: [],
  templates: [],
  starterDocument: {
    fileName: "documento.md",
    contents: `---
title: Documento
estado: borrador
---

`,
  },
};
