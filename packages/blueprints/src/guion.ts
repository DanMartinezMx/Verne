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
      description:
        "Personajes. Deseo, oponente y necesidad: el mínimo de John Truby (The Anatomy of Story) para no contradecirte en la escena 40.",
      fields: [
        { key: "nombre", label: "Nombre", type: "string" },
        { key: "deseo", label: "Qué quiere", type: "string" },
        { key: "necesidad", label: "Qué necesita (y no sabe)", type: "string" },
        { key: "oponente", label: "Quién se lo impide", type: "string" },
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
      id: "ocho-secuencias",
      label: "Escaleta en ocho secuencias (Daniel / Gulino)",
      contents: `---
title: "{{title}}"
estado: escaleta
---

> El enfoque de secuencias de Frank Daniel, recogido por Paul Gulino (*Screenwriting:
> The Sequence Approach*, 2004): un largometraje son ocho secuencias de unos
> quince minutos, cada una con su propio objetivo y su propio final.

| # | Secuencia | Objetivo de la secuencia | Cómo acaba |
|---|---|---|---|
| 1 | Planteamiento y detonante |  |  |
| 2 | Objetivo declarado |  |  |
| 3 | Primer obstáculo |  |  |
| 4 | Primer intento serio (al punto medio) |  |  |
| 5 | Consecuencias del punto medio |  |  |
| 6 | Presión máxima |  |  |
| 7 | Todo perdido y decisión final |  |  |
| 8 | Clímax y resolución |  |  |
`,
    },
    {
      id: "paradigma",
      label: "Paradigma en tres actos (Syd Field)",
      contents: `---
title: "{{title}}"
estado: escaleta
---

> El paradigma de Syd Field (*Screenplay*, 1979). Las páginas son de un guion de
> 110: sirven para ver si el segundo acto se está descolgando.

## Acto I — Planteamiento (pp. 1–30)

**Detonante.**

**Primer nudo de la trama (p. ~27).** Lo que empuja al protagonista al acto II.

## Acto II — Confrontación (pp. 30–90)

**Punto medio (p. ~55).**

**Segundo nudo de la trama (p. ~85).**

## Acto III — Resolución (pp. 90–110)

**Clímax.**
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
