import type { BlueprintDef } from "./types.js";

/**
 * Espacio Novela (RFC-0003 §3). Un solo tipo para novela corta y novela larga:
 * comparten estados, herramientas, fichas, plantillas y estilo, y lo único que
 * cambia es cuántas palabras son y cómo se agrupan los capítulos. Eso es un
 * campo (`target` en el manifiesto) y un andamio, no una definición duplicada.
 *
 * Las plantillas y las fichas siguen modelos de oficio reales, con su fuente
 * citada: igual que el panel de calidad usa Fernández-Huerta y no una heurística
 * inventada, aquí se ofrece lo que los escritores usan de verdad. Cada plantilla
 * explica su modelo en dos líneas y el escritor borra la explicación al escribir
 * (P16 de RFC-0001: los diagnósticos enseñan).
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
      /**
       * Campos según los siete pasos de John Truby (*The Anatomy of Story*,
       * 2007), reducidos a lo que se consulta mientras se escribe. La distinción
       * entre lo que un personaje QUIERE y lo que NECESITA es el eje de casi
       * toda la teoría moderna del personaje (Truby, McKee).
       */
      description:
        "Personajes. Campos según los siete pasos de John Truby (The Anatomy of Story): lo que el personaje quiere no es lo que necesita, y de esa distancia sale su arco.",
      fields: [
        { key: "nombre", label: "Nombre", type: "string" },
        {
          key: "rol",
          label: "Rol",
          type: "enum",
          values: ["protagonista", "antagonista", "aliado", "mentor", "interés amoroso", "secundario"],
        },
        { key: "deseo", label: "Qué quiere (deseo consciente)", type: "string" },
        { key: "necesidad", label: "Qué necesita (y no sabe)", type: "string" },
        { key: "oponente", label: "Quién se lo impide", type: "string" },
        { key: "revelacion", label: "Qué descubre de sí mismo", type: "string" },
      ],
    },
    {
      name: "localizaciones",
      label: "Localizaciones",
      description:
        "Localizaciones. El detalle sensorial concreto es lo que hace que un lugar se describa igual dos veces y se recuerde: la recomendación clásica de mostrar en lugar de contar, hecha ficha.",
      fields: [
        { key: "lugar", label: "Lugar", type: "string" },
        { key: "epoca", label: "Cuándo", type: "string" },
        { key: "atmosfera", label: "Atmósfera", type: "string" },
        { key: "detalle", label: "Detalle sensorial concreto", type: "string" },
      ],
    },
    {
      name: "tramas",
      label: "Tramas",
      /**
       * `planta` y `paga` son *setup* y *payoff*: la regla de oficio de que todo
       * lo que se cobra hay que haberlo sembrado antes (y viceversa: lo sembrado
       * y no cobrado es el cabo suelto que el lector recuerda).
       */
      description:
        "Tramas. Cada hilo con dónde se siembra y dónde se cobra (setup y payoff): lo sembrado y no cobrado es el cabo suelto que el lector recuerda.",
      fields: [
        { key: "hilo", label: "Hilo", type: "string" },
        { key: "tipo", label: "Tipo", type: "enum", values: ["principal", "subtrama", "contratrama"] },
        { key: "planta", label: "Se siembra en", type: "string" },
        { key: "paga", label: "Se cobra en", type: "string" },
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
      label: "Escena (escena y secuela, Swain)",
      contents: `---
title: "{{title}}"
estado: idea
sinopsis: ""
pov: ""
---

> Modelo de Dwight V. Swain (*Techniques of the Selling Writer*, 1965): una
> escena es un intento que sale mal, y una secuela es lo que el personaje hace
> con ese fracaso. Borra estas líneas y escribe encima.

## Escena

**Objetivo.** Qué quiere conseguir el personaje aquí, concreto y ahora.

**Conflicto.** Quién o qué se lo impide, escalando.

**Desastre.** Cómo termina peor de lo que empezó (o consigue lo que quería y le
sale caro).

## Secuela

**Reacción.** Lo que siente antes de poder pensar.

**Dilema.** Las opciones que le quedan, todas malas.

**Decisión.** La que toma, y que abre la escena siguiente.
`,
    },
    {
      id: "estructura-tres-actos",
      label: "Estructura en tres actos (Freytag)",
      contents: `---
title: "{{title}}"
estado: escaleta
sinopsis: ""
pov: ""
---

> Pirámide de Gustav Freytag (*Die Technik des Dramas*, 1863), el esqueleto del
> que descienden casi todos los demás modelos.

## Exposición

Quién, dónde, y qué equilibrio se va a romper.

## Acción ascendente

## Clímax

El punto sin retorno: la decisión más difícil, tomada por el protagonista.

## Acción descendente

## Desenlace

El equilibrio nuevo, que no es el de la exposición.
`,
    },
    {
      id: "quince-tiempos",
      label: "Escaleta en quince tiempos (Snyder)",
      contents: `---
title: "{{title}}"
estado: escaleta
sinopsis: ""
pov: ""
---

> Los quince tiempos de Blake Snyder (*Save the Cat!*, 2005). Los porcentajes
> son de la obra completa, no una ley: sirven para ver si algo llega tarde.

| % | Tiempo | Qué pasa |
|---|---|---|
| 1 | Imagen inicial |  |
| 5 | Tema enunciado |  |
| 1–10 | Planteamiento |  |
| 10 | Catalizador |  |
| 10–20 | Duda |  |
| 20 | Entrada al segundo acto |  |
| 22 | Trama B |  |
| 20–50 | Juegos y promesas |  |
| 50 | Punto medio |  |
| 50–75 | Los malos aprietan |  |
| 75 | Todo está perdido |  |
| 75–80 | Noche oscura del alma |  |
| 80 | Entrada al tercer acto |  |
| 80–99 | Final |  |
| 100 | Imagen final |  |
`,
    },
    {
      id: "viaje-del-heroe",
      label: "El viaje del héroe (Campbell / Vogler)",
      contents: `---
title: "{{title}}"
estado: escaleta
sinopsis: ""
pov: ""
---

> Doce etapas según Christopher Vogler (*El viaje del escritor*, 1992), sobre el
> monomito de Joseph Campbell (1949). No todas las historias lo siguen, y
> forzarlo se nota: úsalo para diagnosticar, no para rellenar.

1. **Mundo ordinario.**
2. **La llamada a la aventura.**
3. **El rechazo de la llamada.**
4. **El encuentro con el mentor.**
5. **El cruce del primer umbral.**
6. **Pruebas, aliados y enemigos.**
7. **La aproximación a la cueva más profunda.**
8. **La prueba suprema.**
9. **La recompensa.**
10. **El camino de vuelta.**
11. **La resurrección.**
12. **El regreso con el elixir.**
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

Al crear un capítulo puedes partir de una plantilla: hay modelos de oficio con su
fuente citada (escena y secuela de Swain, tres actos de Freytag, los quince
tiempos de Snyder, el viaje del héroe de Vogler). Están en \`plantillas/\` y son
archivos tuyos: cámbialos como quieras.
`,
  },
};
