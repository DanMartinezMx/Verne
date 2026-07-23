# Verne Project Format (VPF) — versión 0.1

> Estado: borrador vivo; evoluciona junto al código en v0.x. Cambios incompatibles
> exigen subir la versión mayor y quedar registrados aquí. Contexto de diseño:
> RFC-0001 §6 y RFC-0002 §5.

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
├── colecciones/        # Fichas con esquema: colecciones/<nombre>/*.md + _schema.yaml
├── recursos/           # Binarios (imágenes, adjuntos)
├── export/             # Perfiles de exportación (a partir del hito M3)
├── papelera/           # Documentos borrados en la app (borrar = mover, nunca destruir)
└── .verne/             # Estado interno regenerable (índice, snapshots). No versionar
```

Los nombres de carpeta (`contenido`, `colecciones`, `recursos`, `export`, `papelera`,
`.verne`) son parte de la especificación.

## `verne.yaml`

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `vpf` | string | sí | Versión de la spec (`"0.1"`). Compatibilidad por versión mayor |
| `name` | string | sí | Nombre del proyecto (para humanos) |
| `blueprint` | string | sí | Tipo de proyecto. En 0.1: `blog` \| `cuento` \| `guion` \| `podcast` \| `diario` |
| `language` | string | no (def. `es`) | Código BCP 47 del idioma principal |
| `createdAt` | string | no | Fecha ISO 8601 de creación |
| `author` | string | no | Nombre del autor (lo usan las exportaciones) |

Campos desconocidos se preservan y se ignoran (compatibilidad hacia delante).

## Documentos (`contenido/**/*.md`)

- Codificación UTF-8, saltos de línea `\n` preferidos (`\r\n` tolerado al leer).
- Frontmatter YAML opcional delimitado por `---`. Campos comunes en 0.1: `title`
  (string), `estado` (string; ver valores por Blueprint abajo), `tags` (lista de
  strings). Los campos desconocidos y los comentarios YAML se preservan al editar
  metadatos desde la app.
- Cuando Verne no edita metadatos, el frontmatter se preserva **byte a byte**; al
  editarlos, solo cambian los campos tocados.
- Archivos y carpetas cuyo nombre empieza por `.` no forman parte del contenido.

## Estados por Blueprint (campo `estado`)

| Blueprint | Estados |
|---|---|
| `blog` | `idea`, `borrador`, `publicada` |
| `cuento` | `idea`, `borrador`, `revision`, `terminado`, `enviado` |
| `guion` | `idea`, `escaleta`, `borrador`, `revision`, `terminado` |
| `podcast` | `idea`, `guion`, `grabado`, `editado`, `publicado` |
| `diario` | `entrada`, `destacada` |

Un `estado` fuera de la lista no es un error: se muestra como "sin estado".

## Colecciones (`colecciones/<nombre>/`)

Cada colección es una carpeta con fichas `.md` (campos en frontmatter + prosa libre)
y un `_schema.yaml` descriptivo. Los archivos que empiezan por `_` no son fichas.
Colección definida en 0.1: **`envios`** (Blueprint cuento) con campos `cuento`
(ruta relativa del documento), `mercado`, `fechaEnvio`, `respuesta`
(`pendiente`/`aceptado`/`rechazado`/`retirado`) y `fechaRespuesta`.

## Papelera (`papelera/`)

Borrar un documento en la app lo mueve a `papelera/` con el nombre
`<timestamp>__<nombre original>.md`. Restaurar lo devuelve a `contenido/` sin pisar
archivos existentes. Vaciar la papelera es una decisión manual del usuario (desde su
explorador de archivos), nunca automática de la app.

## Reservado para versiones futuras

Nombres reservados que las herramientas no deben usar para otra cosa: `.verne/crdt/`
y `.verne/sync.yaml` (colaboración, si su disparador llega — RFC-0002 §8),
`.verne/index.db` (índice) y `.verne/history/` (snapshots, ya en uso).
