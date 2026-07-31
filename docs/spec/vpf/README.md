# Verne Project Format (VPF) — versión 0.2

> Estado: borrador vivo; evoluciona junto al código en v0.x. Cambios incompatibles
> exigen subir la versión mayor y quedar registrados aquí. Contexto de diseño:
> RFC-0001 §6, RFC-0002 §5 y RFC-0003.
>
> **0.2 es compatible hacia atrás:** un proyecto 0.1 se abre sin migración. Lo
> nuevo (`plantillas/`, `options`, `target`, el espacio `novela`) es opcional, y un
> `blueprint` desconocido dejó de ser un error.

## Principios

1. **Un proyecto es una carpeta.** Copiable, versionable con git, sincronizable con
   cualquier herramienta, legible sin Verne.
2. **La prosa es Markdown plano** (CommonMark + frontmatter YAML).
3. **Los metadatos son YAML legible.**
4. **`.verne/` es prescindible:** contiene solo estado derivado o regenerable. Borrarlo
   jamás pierde contenido ni metadatos editoriales. Esta garantía tiene un test
   permanente en CI (`packages/core/tests/project.test.ts`).

## Layout

```text
mi-proyecto/
├── verne.yaml          # Manifiesto (obligatorio; define "esto es un proyecto Verne")
├── contenido/          # La obra: .md y subcarpetas, estructura libre del usuario
├── plantillas/         # Plantillas de documento: .md normales, editables (0.2)
├── colecciones/        # Fichas con esquema: colecciones/<nombre>/*.md + _schema.yaml
├── recursos/           # Binarios (imágenes, adjuntos)
├── export/             # Perfiles de exportación (a partir del hito M3)
├── papelera/           # Documentos borrados en la app (borrar = mover, nunca destruir)
└── .verne/             # Estado interno regenerable (índice, snapshots). No versionar
```

Los nombres de carpeta (`contenido`, `plantillas`, `colecciones`, `recursos`, `export`,
`papelera`, `.verne`) son parte de la especificación.

### La biblioteca no es parte del formato

Verne puede presentar varias carpetas de proyecto como **espacios** de una carpeta
"biblioteca" (RFC-0003 §6), pero eso **no añade nada al formato**: no hay manifiesto de
biblioteca ni índice. Los espacios se descubren buscando `verne.yaml` un nivel por
debajo. Una biblioteca es una carpeta normal con proyectos dentro, y cualquier
herramienta puede hacer lo mismo con un `ls`.

## `verne.yaml`

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `vpf` | string | sí | Versión de la spec (`"0.1"` o `"0.2"`). Compatibilidad por versión mayor |
| `name` | string | sí | Nombre del proyecto (para humanos) |
| `blueprint` | string | sí | Tipo de espacio. Conocidos en 0.2: `blog` \| `cuento` \| `novela` \| `guion` \| `podcast` \| `diario` |
| `language` | string | no (def. `es`) | Código BCP 47 del idioma principal |
| `createdAt` | string | no | Fecha ISO 8601 de creación |
| `author` | string | no | Nombre del autor (lo usan las exportaciones) |
| `options` | mapa de listas | no | Valores admitidos por campo de frontmatter (0.2; ver abajo) |
| `target` | número | no | Meta de palabras de la obra, para espacios de obra larga (0.2) |

Campos desconocidos se preservan y se ignoran (compatibilidad hacia delante).

### Un `blueprint` desconocido no es un error (0.2)

Hasta 0.1, un `blueprint` que la aplicación no conociera impedía abrir el proyecto. En
0.2 **se preserva y el proyecto se abre** con un espacio genérico (escribir, estados
básicos, historial, papelera), de modo que un proyecto creado por una versión futura se
pueda leer hoy. Es la misma promesa que la spec ya hacía para las claves desconocidas,
extendida al valor (RFC-0003 §7.1).

Lo que **sigue** siendo error: falta de `vpf`, de `name` o de `blueprint`; `blueprint`
vacío; YAML inválido; o una versión mayor de VPF que la herramienta no entienda.

### `options`: listas cerradas del proyecto (0.2)

```yaml
options:
  categories:
    - Cine y TV
    - Personal
```

Algunos campos de frontmatter admiten solo ciertos valores (las categorías de un blog,
por ejemplo, porque su generador de sitios falla ante una desconocida). El **tipo de
espacio decide qué campos son así**; el **proyecto decide cuáles son los valores**. La
aplicación los ofrece para marcar en lugar de escribir, así que un valor mal escrito no
llega al archivo.

Nacen de los que sugiere el espacio al crear el proyecto y desde ahí son del usuario:
editar esta lista —aquí o desde la aplicación— añade o quita valores. Una entrada que no
sea una lista de textos se ignora sin impedir abrir el proyecto.

## Documentos (`contenido/**/*.md`)

- Codificación UTF-8, saltos de línea `\n` preferidos (`\r\n` tolerado al leer).
- Frontmatter YAML opcional delimitado por `---`. Campos comunes: `title` (string),
  `estado` (string; ver valores por espacio abajo), `tags` (lista de strings). Cada
  espacio puede declarar campos propios (el `description`, `categories` o `draft` de un
  blog; la `sinopsis` o el `pov` de una novela). Los campos desconocidos y los
  comentarios YAML se preservan al editar metadatos desde la app.
- Cuando Verne no edita metadatos, el frontmatter se preserva **byte a byte**; al
  editarlos, solo cambian los campos tocados.
- Un espacio puede declarar una **fecha de modificación** que la aplicación refresca al
  guardar (el `updatedAt` que espera un generador de sitios). Guardar es automático, así
  que no se refresca en cada guardado sino como mucho una vez por minuto: dentro de ese
  intervalo el archivo no se toca y la preservación byte a byte se mantiene.
- Archivos y carpetas cuyo nombre empieza por `.` no forman parte del contenido.

### El orden es el de los archivos

Una obra repartida en varios documentos (una novela) se ordena por el **nombre de los
archivos y carpetas**, con orden natural: `01-`, `02-`, `10-` salen bien y `2-` va antes
de `10-`. No hay campo `orden` en el frontmatter a propósito: así el orden se ve igual en
Verne y en el explorador de archivos, y renombrar o mover un capítulo reordena la obra.

## Plantillas (`plantillas/`) — 0.2

Cada plantilla es un archivo `.md` normal con su frontmatter. El nombre del archivo (sin
`.md`) es su identificador; su `title` es la etiqueta que se muestra, o el nombre del
archivo si el título lleva un marcador sin sustituir. Los archivos que empiezan por `_` o
por `.` no son plantillas.

Marcadores sustituidos al crear un documento:

| Marcador | Se sustituye por |
|---|---|
| `{{title}}` | El título que escribió quien crea el documento |
| `{{fecha}}` | Fecha y hora actuales en ISO 8601 |

Los marcadores **van entre comillas** en la plantilla (`title: "{{title}}"`) por dos
razones: así el archivo es YAML válido antes de sustituir nada —se puede abrir y parsear
con cualquier herramienta— y así el valor se inserta escapado, sin que un título con dos
puntos o comillas rompa el frontmatter del documento nuevo.

Las plantillas de un espacio se escriben al crear el proyecto y **nunca se sobrescriben**:
a partir de ese momento son del usuario.

## Estados por espacio (campo `estado`)

| Espacio | Estados |
|---|---|
| `blog` | `idea`, `borrador`, `publicada` |
| `cuento` | `idea`, `borrador`, `revision`, `terminado`, `enviado` |
| `novela` | `idea`, `escaleta`, `borrador`, `revision`, `terminado` |
| `guion` | `idea`, `escaleta`, `borrador`, `revision`, `terminado` |
| `podcast` | `idea`, `guion`, `grabado`, `editado`, `publicado` |
| `diario` | `entrada`, `destacada` |

Un `estado` fuera de la lista no es un error: se muestra como "sin estado".

Un espacio puede **derivar** un campo del estado: el blog escribe `draft: false` cuando
`estado` pasa a `publicada`, para que el archivo valga tal cual en su generador de sitios.
La derivación solo ocurre al cambiar el estado, así que un valor puesto a mano sobrevive a
cualquier otra edición.

## Colecciones (`colecciones/<nombre>/`)

Cada colección es una carpeta con fichas `.md` (campos en frontmatter + prosa libre) y un
`_schema.yaml` descriptivo. Los archivos que empiezan por `_` no son fichas.

El `_schema.yaml` declara los campos con su tipo (`string`, `date`, `enum` con `values`) y
su etiqueta. Un campo con `ref: documento` guarda la ruta relativa de un documento del
proyecto.

Colecciones definidas por los espacios de 0.2:

| Espacio | Colecciones |
|---|---|
| `cuento` | `envios` (`cuento` → documento, `mercado`, `fechaEnvio`, `respuesta` ∈ `pendiente`/`aceptado`/`rechazado`/`retirado`, `fechaRespuesta`) |
| `novela` | `personajes`, `localizaciones`, `tramas` |
| `guion` | `personajes` |

## Papelera (`papelera/`)

Borrar un documento en la app lo mueve a `papelera/` con el nombre
`<timestamp>__<nombre original>.md`. Restaurar lo devuelve a `contenido/` sin pisar
archivos existentes. Vaciar la papelera es una decisión manual del usuario (desde su
explorador de archivos), nunca automática de la app.

## Reservado para versiones futuras

Nombres reservados que las herramientas no deben usar para otra cosa: `.verne/crdt/`
y `.verne/sync.yaml` (colaboración, si su disparador llega — RFC-0002 §8),
`.verne/index.db` (índice) y `.verne/history/` (snapshots, ya en uso).

## Historial de versiones

- **0.2** — `plantillas/`, `options`, `target`, el espacio `novela`, colecciones de
  personajes/localizaciones/tramas, y un `blueprint` desconocido deja de ser error.
  Compatible hacia atrás con 0.1 (RFC-0003).
- **0.1** — Primera versión: manifiesto, `contenido/`, `colecciones/`, `recursos/`,
  `export/`, `papelera/`, `.verne/`.
