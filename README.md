# Verne

**Escribe blogs y cuentos en una app que respeta tus archivos.** Libre, open source
y local-first, para Windows.

Verne es una aplicación de escritura donde cada proyecto adapta la experiencia a lo
que escribes: un proyecto de **blog** tiene estados editoriales y exportación limpia
para tu CMS; un proyecto de **cuentos** tiene registro de envíos a revistas y
exportación en formato de manuscrito estándar. Y tu obra son siempre **archivos
Markdown en una carpeta normal**: si Verne desaparece mañana, tus textos siguen ahí,
legibles con cualquier editor.

## Qué hace hoy (v0.2)

- **Editor de texto rico** que guarda Markdown: barra de formato, atajos, modo
  enfoque, autosave y snapshots de seguridad locales.
- **Cinco tipos de proyecto**, cada uno adapta la app a lo que escribes:
  - *Blog*: estados idea → borrador → publicada; copiar HTML/Markdown limpio para
    pegar en cualquier CMS, o guardar como archivo.
  - *Cuentos*: estados hasta enviado; **registro de envíos** (a qué revista, cuándo,
    qué respondieron); exportación **DOCX en formato manuscrito estándar** (Times 12,
    doble espacio, encabezado con apellido y página, "Fin").
  - *Diario*: entradas nombradas por fecha (orden cronológico); enviar en blanco crea
    la entrada de hoy.
  - *Guion* y *Podcast*: estados y estructura propios de cada formato.
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
