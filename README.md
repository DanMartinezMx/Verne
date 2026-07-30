# Verne

**Escribe blogs y cuentos en una app que respeta tus archivos.** Libre, open source
y local-first, para Windows.

Verne es una aplicación de escritura donde cada proyecto adapta la experiencia a lo
que escribes: un proyecto de **blog** tiene estados editoriales y exportación limpia
para tu CMS; un proyecto de **cuentos** tiene registro de envíos a revistas y
exportación en formato de manuscrito estándar. Y tu obra son siempre **archivos
Markdown en una carpeta normal**: si Verne desaparece mañana, tus textos siguen ahí,
legibles con cualquier editor.

## Qué hace hoy (v0.3)

- **Editor de texto rico** que guarda Markdown: barra de formato, atajos, modo
  enfoque, autosave y snapshots de seguridad locales.
- **Espacios**: elige una carpeta de escritura y Verne muestra los proyectos que hay
  dentro como espacios entre los que saltas desde la barra lateral. Cada espacio
  cambia los menús, el estilo, las plantillas, las herramientas y los exportadores —
  y sigue siendo una carpeta normal: Verne no añade ningún archivo para gestionarla.
- **Seis tipos de espacio**, cada uno adapta la app a lo que escribes:
  - *Blog*: estados idea → borrador → publicada; el frontmatter que espera tu sitio
    (descripción, categorías, portada, serie) editable desde la cabecera, con `draft`
    que se pone en `false` solo al publicar; guardar el archivo listo para copiarlo al
    repositorio de tu sitio, o copiar HTML/Markdown limpio para pegar en un CMS.
  - *Cuentos*: estados hasta enviado; **registro de envíos** (a qué revista, cuándo,
    qué respondieron); exportación **DOCX en formato manuscrito estándar** (Times 12,
    doble espacio, encabezado con apellido y página, "Fin").
  - *Novela*: capítulos en carpetas, **panel Manuscrito** con las palabras de cada
    capítulo y el avance sobre tu meta, **compilar** toda la obra en un documento, y
    fichas de personajes, localizaciones y tramas. Novela corta o completa es la misma
    clase de espacio con otra meta.
  - *Diario*: entradas nombradas por fecha (orden cronológico); enviar en blanco crea
    la entrada de hoy.
  - *Guion*: escribe `INT. ` o `EXT. ` al principio de una línea y se convierte en
    escena; el editor en monoespaciada, fichas de personaje.
  - *Podcast*: estados de producción, invitado y duración, plantillas de guion y notas.
- **Plantillas que son tuyas**: cada espacio siembra las suyas en `plantillas/` como
  Markdown normal. Edítalas con el Bloc de notas y el cambio aparece en el selector;
  añade las que quieras. Verne nunca sobrescribe una plantilla que tocaste.
- **Calidad sin IA**, local e instantánea, que además de señalar explica: legibilidad
  (Fernández-Huerta), repeticiones cercanas, frases largas, adverbios en -mente y
  muletillas. En el panel "Calidad" o **subrayado en vivo mientras escribes**, con la
  explicación al pasar el cursor.
- **Historial visible**: cada documento guarda versiones; ábrelas, míralas y
  **restaura** una desde el botón "Historial" (restaurar respalda antes lo actual —
  nunca pierdes nada).
- **Organiza tu árbol**: crea carpetas, **renombra y mueve** documentos y carpetas
  (arrastrando su historial), además de títulos, etiquetas, filtros por estado,
  búsqueda global que ignora acentos y papelera reversible (borrar = mover a
  `papelera/`, visible en tu explorador).
- **Adopta lo que ya tienes**: abre una carpeta de Markdown suelto (ex-Obsidian, notas
  dispersas) y Verne la convierte en proyecto sin cambiar el formato de tus textos.
- **Tema claro/oscuro** que sigue al sistema o fuerzas tú, sin parpadeos.
- **Aviso discreto de nueva versión** (opcional; nunca descarga sola ni te bloquea).
- **Tus datos, tuyos**: formato abierto documentado ([VPF](docs/spec/vpf/README.md));
  borrar la carpeta interna `.verne/` nunca pierde una palabra (hay un test
  permanente que lo garantiza).

### Novedades

- **v0.3.0** — **espacios**: una carpeta de escritura con proyectos dentro y un
  conmutador para saltar entre ellos; cada espacio decide sus plantillas, fichas,
  campos, estilo y exportadores como **datos** y no como código de la interfaz
  ([RFC-0003](rfcs/0003-espacios.md)). Nuevo espacio **Novela** con panel de
  manuscrito y compilación. Plantillas de documento editables. El frontmatter del
  blog encaja con tu sitio sin retoques a mano. Un proyecto de un tipo que esta
  versión no conozca ya se puede abrir y leer.
- **v0.2.0** — subrayados de calidad en vivo en el editor (sobre una nueva API de
  decoraciones reutilizable), historial visible con restaurar, gestión del árbol
  (renombrar, carpetas, mover), adopción de carpetas Markdown existentes y aviso
  discreto de nueva versión.
- **v0.1.1** — panel de calidad sin IA, control de tema claro/oscuro y tres plantillas
  nuevas (Diario, Guion, Podcast).

Notas completas de cada versión en [Releases](../../releases).

## Qué NO hace todavía (a propósito)

- **Sincronización propia**: usa [Syncthing o git sobre tus carpetas](docs/guia-multidispositivo.md) —
  funciona hoy y sin depender de nadie.
- **Plugins, IA, exportación EPUB/PDF, móvil, macOS/Linux**: diseñados en los RFCs,
  construidos solo cuando su necesidad sea real. Verne funciona completo sin
  Internet y sin ninguna IA, siempre. Lo que se sabe hoy sobre llevarlo a iOS —y por
  qué un PWA no serviría— está en [RFC-0003 §8](rfcs/0003-espacios.md), para no
  investigarlo dos veces.
- **Formato profesional de guion** (Fountain, Final Draft): el espacio Guion usa las
  convenciones de Markdown, no un esquema propio. Está anotado en `rfcs/ideas.md`.

## Instalar

Descarga el instalador de Windows desde
[Releases](../../releases). El binario no está firmado todavía: Windows SmartScreen
puede pedirte confirmación ("Más información" → "Ejecutar de todas formas").

## Desarrollo

Requisitos: Node ≥ 22, [pnpm](https://pnpm.io) 10, y [Rust](https://rustup.rs) +
los [prerequisitos de Tauri](https://tauri.app/start/prerequisites/).

```sh
pnpm install
pnpm check                          # typecheck + tests + lint de fronteras
pnpm --filter @verne/desktop tauri dev    # app de escritorio en desarrollo
```

Estructura: `packages/core` (lógica y formato VPF, sin UI), `packages/editor`
(ProseMirror encapsulado), `packages/blueprints` (tipos de espacio),
`packages/export` (HTML/Markdown/DOCX), `packages/ui` (componentes React),
`apps/desktop` (caparazón Tauri), `docs/spec/vpf` (la especificación del formato),
`examples/` (proyectos de ejemplo). Las fronteras entre paquetes las vigila
`pnpm lint:boundaries` en CI.

Para mirar la interfaz sin instalar Rust ni Tauri, `pnpm --filter @verne/desktop dev`
levanta la app en el navegador (`localhost:1420`) sobre un sistema de archivos en
memoria con espacios de demo. Es posible porque `core` nunca toca el disco: recibe un
adaptador. No sustituye a `tauri dev` — ahí no se prueban los diálogos nativos ni el
caparazón.

## El proyecto

Verne es el proyecto personal de un solo maintainer, construido primero para su
propio uso y abierto desde el primer día. Las decisiones grandes quedan registradas
con su razonamiento en [`rfcs/`](rfcs/):

- **[RFC-0001](rfcs/0001-vision-y-arquitectura.md)** — el mapa a 10 años: la visión
  completa ("un sistema operativo para escritores"), arquitectura, plugins,
  sincronización CRDT, IA local opcional, multiplataforma.
- **[RFC-0002](rfcs/0002-alcance-solo-dev.md)** — el plan vigente: qué se construye
  ahora, qué se aplaza y qué lo reactivaría.
- **[RFC-0003](rfcs/0003-espacios.md)** — los espacios: por qué el tipo de proyecto
  pasó a ser un contrato de datos, por qué novela corta y larga son el mismo espacio,
  y por qué móvil sigue esperando.

¿Quieres contribuir o entender cómo se gobierna? Lee
[CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

[AGPL-3.0](LICENSE) para todo el repositorio en v0.x. Cuando existan el SDK de
plugins y las bibliotecas del formato VPF, se publicarán bajo MIT/Apache-2.0 para
que cualquier herramienta pueda implementar el formato (RFC-0001 §19.5.4,
RFC-0002 §7.2).
