# Verne

**Escribe blogs y cuentos en una app que respeta tus archivos.** Libre, open source
y local-first, para Windows.

Verne es una aplicación de escritura donde cada proyecto adapta la experiencia a lo
que escribes: un proyecto de **blog** tiene estados editoriales y exportación limpia
para tu CMS; un proyecto de **cuentos** tiene registro de envíos a revistas y
exportación en formato de manuscrito estándar. Y tu obra son siempre **archivos
Markdown en una carpeta normal**: si Verne desaparece mañana, tus textos siguen ahí,
legibles con cualquier editor.

## Qué hace hoy (v0.1)

- **Editor de texto rico** que guarda Markdown: barra de formato, atajos, modo
  enfoque, autosave y snapshots de seguridad locales.
- **Dos tipos de proyecto** con experiencias distintas:
  - *Blog*: estados idea → borrador → publicada; copiar HTML/Markdown limpio para
    pegar en cualquier CMS, o guardar como archivo.
  - *Cuentos*: estados hasta enviado; **registro de envíos** (a qué revista, cuándo,
    qué respondieron); exportación **DOCX en formato manuscrito estándar** (Times 12,
    doble espacio, encabezado con apellido y página, "Fin").
- **Organización**: títulos, etiquetas, filtros por estado, búsqueda global que
  ignora acentos, papelera reversible (borrar = mover a `papelera/`, visible en tu
  explorador).
- **Tus datos, tuyos**: formato abierto documentado ([VPF](docs/spec/vpf/README.md));
  borrar la carpeta interna `.verne/` nunca pierde una palabra (hay un test
  permanente que lo garantiza).

## Qué NO hace todavía (a propósito)

- **Sincronización propia**: usa [Syncthing o git sobre tus carpetas](docs/guia-multidispositivo.md) —
  funciona hoy y sin depender de nadie.
- **Plugins, IA, exportación EPUB/PDF, móvil, macOS/Linux**: diseñados en los RFCs,
  construidos solo cuando su necesidad sea real. Verne funciona completo sin
  Internet y sin ninguna IA, siempre.

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
(ProseMirror encapsulado), `packages/blueprints` (tipos de proyecto),
`packages/export` (HTML/Markdown/DOCX), `packages/ui` (componentes React),
`apps/desktop` (caparazón Tauri), `docs/spec/vpf` (la especificación del formato),
`examples/` (proyectos de ejemplo). Las fronteras entre paquetes las vigila
`pnpm lint:boundaries` en CI.

## El proyecto

Verne es el proyecto personal de un solo maintainer, construido primero para su
propio uso y abierto desde el primer día. Las decisiones grandes quedan registradas
con su razonamiento en [`rfcs/`](rfcs/):

- **[RFC-0001](rfcs/0001-vision-y-arquitectura.md)** — el mapa a 10 años: la visión
  completa ("un sistema operativo para escritores"), arquitectura, plugins,
  sincronización CRDT, IA local opcional, multiplataforma.
- **[RFC-0002](rfcs/0002-alcance-solo-dev.md)** — el plan vigente: qué se construye
  ahora, qué se aplaza y qué lo reactivaría.

¿Quieres contribuir o entender cómo se gobierna? Lee
[CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

[AGPL-3.0](LICENSE) para todo el repositorio en v0.x. Cuando existan el SDK de
plugins y las bibliotecas del formato VPF, se publicarán bajo MIT/Apache-2.0 para
que cualquier herramienta pueda implementar el formato (RFC-0001 §19.5.4,
RFC-0002 §7.2).
