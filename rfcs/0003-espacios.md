# RFC-0003 — Espacios: el Blueprint como contrato de datos

| Campo | Valor |
|---|---|
| Estado | Aceptado (decisión del maintainer) |
| Tipo | Profundización del modelo de Blueprints (RFC-0001 §10) dentro del alcance de RFC-0002 |
| Fecha | 2026-07-30 |
| Relación | No enmienda RFC-0002: reactiva uno de sus disparadores (§8, Blueprint Novela) y desarrolla RFC-0001 §10 |

---

## 0. Contexto y motivación

Tras v0.2, la app cumple su promesa: el maintainer escribe en ella. Pero la promesa **P6** de
RFC-0001 ("el novelista jamás ve SEO; el blogger jamás ve fichas de personaje") se sostiene hoy
con `if`, no con datos:

- `ExportPanel.tsx` decide toda la exportación con `props.blueprint.id === "blog"`.
- `type View` en `App.tsx` es una unión fija: ningún Blueprint puede declarar qué paneles tiene.
- `submissions` es un campo del Blueprint cableado a una colección concreta (`envios`).
- `dailyNaming` es un booleano que existe para un solo Blueprint.

Cada tipo de texto nuevo cuesta, hoy, tocar la app en cuatro sitios. Eso es exactamente lo que
RFC-0002 §4.3 quería evitar ("los Blueprints consumen la misma API interna que un plugin
consumiría"): la disciplina se ha ido erosionando con la velocidad del desarrollo asistido, que es
el riesgo que RFC-0002 §9 anticipó.

Al mismo tiempo hay tres necesidades reales, del uso diario y no de la especulación:

1. **Plantillas.** Hay una sola por tipo de proyecto (`starterDocument`) y solo se usa al crear el
   proyecto. Cada capítulo, cada escena y cada entrada se empieza a mano.
2. **Novela.** El maintainer quiere escribir novela corta y novela larga en Verne. Es el
   disparador de RFC-0002 §8 ("que el maintainer lo necesite de verdad"), y se declara cumplido.
3. **El frontmatter del blog no encaja con el sitio del maintainer.** Verne escribe `title` y
   `estado`; el sitio necesita `description`, `categories`, `createdAt`, `image` y `draft`. Cada
   entrada publicada exige retoques a mano en otro editor — o sea, Verne no cierra su propio ciclo.

**La tesis de este RFC:** las tres se resuelven con la misma pieza. Si el Blueprint declara sus
paneles, plantillas, colecciones, campos de frontmatter y estilo como **datos**, entonces añadir
novela es escribir una definición, y arreglar el blog es rellenar un campo. Sin esa pieza, son tres
trabajos que se pisan.

---

## 1. Decisiones

Continúa la numeración del índice de decisiones de RFC-0001 (Apéndice B).

| # | Decisión | Resumen |
|---|---|---|
| **D11** | **El Blueprint es un contrato de datos** | Declara paneles, perfiles de exportación, plantillas, colecciones, campos de frontmatter, tema y andamio. La UI no contiene ni un `if` por `id` |
| **D12** | **Un solo Blueprint `novela`, parametrizado** | Novela corta y novela larga son el mismo tipo con distinta meta de palabras (`target`) y distinto andamio. No dos Blueprints |
| **D13** | **Una plantilla es un archivo Markdown** | Las integradas se siembran en `plantillas/` al crear el espacio; la app lee **solo del disco**. Un camino de código, y el usuario manda |
| **D14** | **El frontmatter lo declara el espacio** | `metaFields` define qué campos existen, de qué tipo y cuáles se derivan del estado. El blog calca el esquema del sitio destino |
| **D15** | **Un `blueprint` desconocido deja de ser un error** | `parseManifest` lo preserva y la app cae a un espacio genérico. Compatibilidad hacia delante real, no prometida |

Y una decisión sobre lo que **no** se construye:

| # | Decisión | Resumen |
|---|---|---|
| **D16** | **Móvil sigue aplazado** | iOS es un lujo, no una necesidad. Se registra lo aprendido (§8) para no re-investigarlo, y se cierra |

### 1.1 Lo que NO cambia

- **No hay sistema de plugins.** D7 de RFC-0001 sigue aplazada. Los espacios son configuración
  tipada del monorepo y `ExportProfileId` es una **unión cerrada**. No hay registro
  dinámico, ni carga en caliente, ni sandbox. Lo que se gana es que el día que los plugins lleguen,
  la superficie que necesitarán ya estará forzada por seis espacios reales — que es literalmente el
  argumento de RFC-0002 §4.3.2.
- **La palabra en el código sigue siendo `Blueprint`.** "Espacio" es vocabulario de la UI.
  Renombrar el tipo tocaría todo el repo para no ganar nada.
- CRDT, IA, sync propia, EPUB/PDF, gamificación: fuera, sin cambios.

---

## 2. El contrato de espacio (D11)

`BlueprintDef` pasa de configurar *vocabulario y estados* a configurar *la experiencia completa*,
que es lo que RFC-0001 §10.1 siempre dijo que era un Blueprint:

| Campo nuevo | Qué decide |
|---|---|
| `exportProfiles: ExportProfileId[]` | Qué ofrece el panel de exportación |
| `templates: TemplateDef[]` | Qué plantillas se siembran al crear el espacio |
| `collections: CollectionDef[]` | Qué colecciones existen y con qué campos |
| `metaFields: MetaFieldDef[]` | Qué campos de frontmatter se editan en la cabecera |
| `tagsField?: string` | De qué campo salen las etiquetas (`tags` por defecto) |
| `theme: SpaceTheme` | Acento (claro y oscuro) y fuente del editor |
| `cmsExtension?: string` | Extensión con la que el perfil "cms" guarda el archivo |
| `manuscript?: {…}` | El espacio es UNA obra larga: meta y formas al crear |
| `scaffold?: string[]` | Carpetas que nacen bajo `contenido/` |
| `naming?: "slug" \| "fecha"` | Cómo se nombra un documento nuevo |
| `sceneHeadings?: boolean` | `INT. ` al principio de línea la convierte en escena |

**Y se borran dos campos:** `submissions` (era una colección con nombre propio → `collections`) y
`dailyNaming` (era un booleano para un caso → `naming: "fecha"`). El diff neto de la fase es casi
plano: se cambia forma, no se añade peso.

### 2.1 No hay lista de paneles: se derivan de lo que el espacio declara

El diseño inicial de este RFC incluía un `panels: PanelId[]`. **Se descartó al implementarlo**, y
en su lugar cada herramienta aparece porque existen los datos que necesita:

| Herramienta | Aparece cuando… |
|---|---|
| Fichas | `collections` no está vacío |
| Manuscrito (avance y compilar) | el espacio declara `manuscript` |
| Exportar | siempre; lo que ofrece sale de `exportProfiles` |
| Calidad, Historial, Papelera | siempre: son universales |

Dos listas que mantener sincronizadas —los paneles y los datos de cada uno— son garantía de que un
día alguien declare `panels: ["colecciones"]` con `collections: []`, o al contrario. Derivar la
herramienta de lo que el espacio *es* hace que ese error no exista. Y una lista `panels` en la que
los seis espacios escriben lo mismo (calidad, historial, papelera) no configura nada: es
ceremonia. P7 aplicado al propio mecanismo de configuración.

Lo que queda cerrado por el compilador es `ExportProfileId`: un identificador abierto con registro
de componentes sería el 80% de un sistema de plugins, con su coste y sin su beneficio —seguiría sin
poder instalar nada.

---

## 3. Blueprint Novela (D12)

RFC-0002 §8 condicionaba el Blueprint Novela a que "el maintainer (o una comunidad activa) lo
necesite de verdad". **Se declara cumplido**, y se anota qué lo cumple, para que el precedente no
sirva de coladero: el maintainer quiere escribir novela corta y larga en Verne, y los cuentos —
que eran el banco de pruebas de la ficción — ya no dan para un manuscrito de 90.000 palabras
repartido en capítulos.

**Un tipo, no dos.** "Novela corta" y "novela completa" comparten estados, herramientas, fichas,
plantillas y estilo. Lo único que difiere es cuántas palabras son y cómo se agrupan los capítulos.
Eso es un campo (`target`) y un andamio, no una definición duplicada con sus estados, sus
plantillas y sus tests. Si algún día divergen de verdad, separarlas es barato; haberlas separado
antes de saberlo no lo es.

**Herramientas de novela en esta versión:** panel Manuscrito (palabras por capítulo, avance sobre
la meta, compilar a un solo documento) y colecciones de personajes, localizaciones y tramas sobre
la primitiva de colecciones que ya existe. **Fuera:** corcho, línea temporal y matriz de POV — se
construyen si el árbol con recuentos se queda corto escribiendo, no antes.

**El avance sobre la meta no es gamificación.** Es un número y una barra. Sin rachas, sin
insignias, sin notificaciones, sin castigo por no escribir hoy. La distinción es deliberada y se
registra aquí para que no se erosione.

---

## 4. Plantillas (D13)

Una plantilla es un `.md` en `plantillas/` del proyecto. Las integradas de cada espacio se
**siembran** al crear el espacio (o al adoptar una carpeta) y desde ese momento son del usuario:
editarlas, borrarlas o añadir las suyas es editar archivos Markdown normales, con su editor de
siempre. La app **lee solo del disco**.

La alternativa —plantillas en el código, con un catálogo interno y una carpeta como añadido— daba
dos caminos de código, dos comportamientos que divergen y la pregunta "¿por qué no puedo editar
esta?". Sembrar y leer del disco da las dos cosas con un solo camino, y es coherente con P1: los
archivos son la verdad, también los de las plantillas.

Consecuencia aceptada: sembrar no pisa lo existente, así que una plantilla integrada que mejore en
una versión futura **no** llega a quien ya la tenía. Es el precio de que sea suya. Si algún día
molesta, la salida es un aviso ("hay una versión nueva de esta plantilla"), nunca sobrescribir.

---

## 5. Frontmatter por espacio (D14)

El caso que lo fuerza es el blog del maintainer:

```yaml
---
title: titulo del blogpost
description: descripcion del blog post
categories: [Cine y TV, Personal]
createdAt: 2026-06-24T23:40:52.966Z
image: /uploads/movi.jpg      # opcional
draft: false
---
```

El esquema no se supuso: se leyó de su repositorio (`tina/config.tsx` y
`scripts/validate-content.mjs`, que corre en su `prebuild`). De ahí salen cuatro choques:

- **La extensión.** El sitio solo renderiza `.mdx` y su validador **rechaza `.md` en duro** ("never
  rendered"). Verne escribe `.md` en el proyecto, porque eso dice VPF, así que el espacio declara
  con qué extensión guarda el perfil "cms" (`cmsExtension`). Sin esto, el botón habría producido un
  archivo que el sitio ignora en silencio.
- **`categories` en lugar de `tags`, y de una lista cerrada.** `readTags` fijaba la cadena `"tags"`;
  gana un parámetro de nombre de campo. Y una categoría que el sitio no conozca hace fallar su
  build, así que se marca de una lista en lugar de escribirse (ver §5.1).
- **`draft` frente a `estado`.** El sitio quiere un booleano; la app necesita tres estados para sus
  chips, filtros y colores. No se elige uno: `draft` se **deriva** de `estado`
  (`draft: estado !== "publicada"`) y se reescribe en el mismo guardado que el estado. `estado`
  permanece en el archivo, inerte para un generador de sitios.
- **`description`, `image`, `createdAt`, `slug`, `series`… no eran editables.** La cabecera del
  documento pasa a recorrer `metaFields`, así que lo son sin código específico de blog.

**El criterio de éxito es concreto y comprobable:** publicar una entrada es copiar el archivo a
`content/posts/` del sitio, y que compile sin un solo retoque a mano. Para eso el perfil "cms" gana
"Guardar .mdx" — hoy `toCleanMarkdown` tira el frontmatter, que es justo lo que el sitio necesita.
Un test refleja las reglas de su validador, así que si el espacio deja de cumplirlas se ve en CI y
no al publicar.

Este mecanismo no es un favor al blog del maintainer: es lo que permite que cualquier espacio hable
el esquema de su destino (el `image` de un sitio, el `duration` de un feed de podcast) sin que la
app aprenda nada sobre ese destino.

### 5.1 Las listas cerradas son del proyecto, no del código

La primera versión metió las doce categorías del blog del maintainer en el código del espacio. Está
mal: son *sus* categorías, y otra persona que escriba un blog tiene otras. Pero dejar el campo como
texto libre devuelve el problema que resolvía —una categoría mal escrita rompe el build del sitio.

La separación correcta: **el espacio declara la forma, el proyecto declara los valores.** El espacio
dice "este campo es una lista cerrada" y aporta unos valores iniciales; al crear el proyecto se
copian a `options` de su `verne.yaml`, y desde ahí son del usuario: los añade y los quita desde la
cabecera o editando el archivo. Lo que se conserva es que la lista sea cerrada **dentro** del
proyecto, que es lo que hace imposible escribir un valor malo.

Se rechazó una colección `colecciones/categorias/` para esto: una lista de doce cadenas no necesita
una carpeta con una ficha por valor.

---

## 6. Biblioteca de espacios (D11, parte de UI)

Los proyectos se presentan como **espacios** al estilo Confluence: una carpeta "biblioteca" con N
espacios dentro y un conmutador en la barra lateral. Al cambiar de espacio cambian los menús, el
estilo, las plantillas y las herramientas.

**La biblioteca no inventa formato.** Es una ruta en las preferencias de la app; los espacios se
descubren buscando `verne.yaml` un nivel por debajo. Cero archivos nuevos, cero cambios en VPF. Un
espacio puede seguir viviendo fuera de la biblioteca: la lista de recientes se queda, y adoptar una
carpeta de Markdown suelto sigue funcionando igual.

Se rechazó un manifiesto de biblioteca (`biblioteca.yaml` con la lista de espacios): sería un
índice que puede desincronizarse de la verdad —las carpetas— para ahorrar un escaneo de un nivel
que cuesta milisegundos. D5 aplicado a un caso pequeño.

---

## 7. VPF 0.2

Compatible hacia atrás; un proyecto v0.1 abre sin migración.

| Cambio | Detalle |
|---|---|
| `plantillas/` | Nueva carpeta del layout, reservada por la spec |
| `blueprint` | Añadido `novela`; un valor desconocido se preserva y no es error (D15) |
| `target` | Campo opcional del manifiesto: meta de palabras del espacio |
| `options` | Campo opcional: valores admitidos por campo de frontmatter (§5.1) |
| Estados | Nueva fila `novela`: `idea`, `escaleta`, `borrador`, `revision`, `terminado` |
| Colecciones | Documentadas `personajes`, `localizaciones` y `tramas` junto a `envios` |
| Orden | Se documenta que el orden de una obra es el de los nombres de archivo, sin campo `orden` |

`.verne/` sigue siendo prescindible: plantillas, colecciones y manuscrito viven **fuera** de ella.
El test permanente de `packages/core/tests/project.test.ts` lo sigue garantizando sin cambios.

### 7.1 D15 en detalle: por qué abrir el valor de `blueprint`

Hoy `parseManifest` lanza `INVALID_MANIFEST` con un `blueprint` que no conoce. Eso significa que un
proyecto creado con una versión futura de Verne **no abre** en la actual — ni para leerlo. Es
incoherente con la promesa que la propia spec ya hace para las claves ("los campos desconocidos se
preservan y se ignoran") y con P1 (otras herramientas pueden implementar el formato). Se extiende la
promesa al valor: se preserva, la app cae a un espacio genérico y avisa. Cuesta diez líneas hoy y
evita una migración obligatoria más adelante.

Lo que **sigue** siendo error: un manifiesto sin `vpf`, sin `name`, con YAML inválido o con una
versión mayor de VPF que esta versión no entiende. Abrir el formato no es dejar de validarlo.

---

## 8. Móvil / iOS: aplazado, con lo aprendido (D16)

Se evaluó llevar Verne a iOS y **se descarta para esta versión**: es un lujo, no una necesidad. Se
registra aquí lo averiguado para no repetir la investigación cuando vuelva a la mesa.

- **El puerto no sería un rediseño.** `VerneFs` (`packages/core/src/fs.ts`) ya aísla el disco tras
  una interfaz inyectada — su comentario ya dice "Tauri hoy, navegador mañana". Ese trabajo está
  pagado, y ningún cambio de este RFC lo toca.
- **Un PWA no sirve.** Safari en iOS no implementa la File System Access API. Los archivos del
  usuario quedarían en almacenamiento invisible para él, lo que rompe P1 — la promesa central del
  proyecto. Un móvil que no puede enseñarte tus `.md` no es Verne.
- **Dónde vivirían los archivos:** en el contenedor de la app, expuesto en la app Archivos vía
  `UIFileSharingEnabled` + `LSSupportsOpeningDocumentsInPlace`. Cero bytes fuera del dispositivo y
  el usuario ve y copia sus archivos. El contenedor de iCloud queda como opción del usuario, nunca
  como decisión de la app.
- **Camino técnico:** Tauri 2 iOS, el default ya declarado en RFC-0001 §5.4, con Capacitor como
  alternativa. Coste de entrada real: un Mac, Xcode y cuenta de Apple (99 USD/año).
- **Único prerequisito estructural:** los paneles viven en `apps/desktop/src/*.tsx` y
  `packages/ui` solo contiene `ProjectTree`. Sin moverlos, una `apps/mobile` duplicaría la app.
- **Primer paso cuando llegue:** un spike desechable (1–2 días, fuera de `main`) que responda si
  `plugin-fs` escribe en el contenedor y si la carpeta aparece en Archivos. Antes de eso, no hay
  nada que prometer.

**Disparador:** que exista una novela viva dentro de Verne y falte de verdad poder leerla y anotarla
fuera del escritorio. El alcance, cuando llegue, es de **compañero** (leer, revisar, anotar,
capturar), no de paridad — RFC-0001 §19.5.3 ya lo decidió y no se revisa.

---

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| La refactorización del contrato rompe los proyectos existentes | El primer paso de la verificación es abrir `examples/blog-demo` y `examples/cuentos-demo` y un `.md` real del blog: mismos estados, mismas exportaciones, envíos intactos. Los tests de blueprints recorren `BLUEPRINT_IDS`, así que un espacio mal declarado no llega a `main` |
| Seis espacios es camino a "doce experiencias mediocres" (RFC-0001 §19.5.1) | El contrato es lo que hace baratos los espacios *y* lo que los mantiene honestos: un espacio que no declara plantillas ni paneles propios no aporta nada y no debería existir. El listón para el siguiente sigue siendo uso real del maintainer |
| `derivedFromState` pisa un `draft` puesto a mano | Solo se recalcula cuando cambia `estado`, y hay un test de que un `draft` editado a mano sobrevive a un guardado que no toca el estado |
| El contrato crece hasta ser un lenguaje de configuración | Cada campo nuevo debe estar usado por ≥2 espacios o resolver un caso real documentado. `metaFields` entra porque el blog lo exige hoy, no porque sea elegante |
| Scope creep: espacios + plantillas + novela + biblioteca de una vez | Cinco fases, cada una útil sola y verificable sola. iOS ya se cayó del alcance por esta razón, y es la prueba de que el freno funciona |

---

## 10. Definición de éxito

> Añadir un tipo de texto nuevo a Verne es escribir un archivo en `packages/blueprints/src/`,
> y publicar una entrada del blog es copiar un archivo.

Si ambas son ciertas cuando esta versión cierre, el RFC acertó. Si añadir un espacio sigue exigiendo
tocar `App.tsx`, no.

---

*Registro de decisión del maintainer conforme a RFC-0002 §7.1. Comentarios bienvenidos en el issue
tracker; la decisión puede revisarse con datos, como todas.*
