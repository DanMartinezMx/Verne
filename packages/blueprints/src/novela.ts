import type { BlueprintDef } from "./types.js";

/**
 * Espacio Novela (RFC-0003 §3). Un solo tipo para novela corta y novela larga:
 * comparten estados, herramientas, fichas, plantillas y estilo, y lo único que
 * cambia es cuántas palabras son y cómo se agrupan los capítulos. Eso es un
 * campo (`target` en el manifiesto) y un andamio, no una definición duplicada.
 *
 * `manuscript` es lo que declara que este espacio es UNA obra repartida en
 * documentos, no un conjunto de piezas independientes: de ahí sale el panel
 * Manuscrito con el avance y la compilación.
 */
export const novelaBlueprint: BlueprintDef = {
  id: "novela",
  label: "Novela",
  vocabulary: {
    documentSingular: "capítulo",
    documentPlural: "Capítulos",
    newDocumentPlaceholder: "Nuevo capítulo…",
  },
  states: [
    { id: "idea", label: "Idea", color: "#f59e0b" },
    { id: "escaleta", label: "Escaleta", color: "#06b6d4" },
    { id: "borrador", label: "Borrador", color: "#6b7280" },
    { id: "revision", label: "Revisión", color: "#3b82f6" },
    { id: "terminado", label: "Terminado", color: "#10b981" },
  ],
  initialState: "idea",
  // Serif y acento cálido: una novela no se lee en la tipografía de un blog.
  theme: { accent: "#b45309", accentDark: "#fbbf24", editorFont: "serif" },
  exportProfiles: ["manuscrito-docx"],
  manuscript: {
    defaultTarget: 90_000,
    shapes: [
      {
        id: "corta",
        label: "Novela corta (~35.000 palabras)",
        target: 35_000,
        scaffold: ["capitulos"],
      },
      {
        id: "larga",
        label: "Novela completa (~90.000 palabras, en tres partes)",
        target: 90_000,
        scaffold: ["01-parte-uno", "02-parte-dos", "03-parte-tres"],
      },
    ],
  },
  metaFields: [
    {
      key: "sinopsis",
      label: "Sinopsis",
      type: "textarea",
      placeholder: "Qué pasa en este capítulo, en dos líneas",
    },
    { key: "pov", label: "Punto de vista", type: "text", placeholder: "Quién narra" },
  ],
  collections: [
    {
      name: "personajes",
      label: "Personajes",
      description: "Quién es quién: lo mínimo para no contradecirte en el capítulo 30.",
      fields: [
        { key: "nombre", label: "Nombre", type: "string" },
        { key: "quiere", label: "Qué quiere", type: "string" },
        { key: "teme", label: "Qué teme", type: "string" },
        { key: "arco", label: "Cómo cambia", type: "string" },
      ],
    },
    {
      name: "localizaciones",
      label: "Localizaciones",
      description: "Dónde pasa: lo que hay que recordar para describirlo igual dos veces.",
      fields: [
        { key: "lugar", label: "Lugar", type: "string" },
        { key: "cuando", label: "Cuándo aparece", type: "string" },
        { key: "detalle", label: "Detalle que no se olvida", type: "string" },
      ],
    },
    {
      name: "tramas",
      label: "Tramas",
      description: "Los hilos abiertos y dónde se cierran, para no dejar ninguno colgando.",
      fields: [
        { key: "hilo", label: "Hilo", type: "string" },
        { key: "abre", label: "Abre en", type: "string" },
        { key: "cierra", label: "Cierra en", type: "string" },
        {
          key: "estado",
          label: "Estado",
          type: "enum",
          values: ["abierto", "en curso", "cerrado", "abandonado"],
        },
      ],
    },
  ],
  templates: [
    {
      id: "capitulo",
      label: "Capítulo",
      contents: `---
title: "{{title}}"
estado: idea
sinopsis: ""
pov: ""
---

`,
    },
    {
      id: "escena",
      label: "Escena",
      contents: `---
title: "{{title}}"
estado: idea
sinopsis: ""
pov: ""
---

`,
    },
    {
      id: "escaleta",
      label: "Escaleta de la novela",
      contents: `---
title: "{{title}}"
estado: escaleta
sinopsis: ""
pov: ""
---

| Capítulo | Qué pasa | Qué cambia | POV |
|---|---|---|---|
| 1 |  |  |  |
| 2 |  |  |  |
`,
    },
  ],
  starterDocument: {
    fileName: "01-capitulo-uno.md",
    contents: `---
title: Capítulo uno
estado: borrador
sinopsis: "Amelia vuelve al faro después de once años."
pov: Amelia
---

Empieza aquí. Cada capítulo es un archivo Markdown dentro de \`contenido/\`, y el
orden del manuscrito es el orden de los archivos: si los nombras \`01-\`, \`02-\`…
se ordenan solos y puedes reorganizarlos arrastrándolos.

En el panel «Manuscrito» ves cuántas palabras llevas por capítulo y sobre tu meta,
y puedes compilar toda la novela en un solo documento para exportarla.
`,
  },
};
