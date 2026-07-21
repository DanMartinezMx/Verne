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
├── recursos/           # Binarios (imágenes, adjuntos)
├── export/             # Perfiles de exportación (a partir del hito M3)
└── .verne/             # Estado interno regenerable (índice, snapshots). No versionar
```

Los nombres de carpeta (`contenido`, `recursos`, `export`, `.verne`) son parte de la
especificación.

## `verne.yaml`

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `vpf` | string | sí | Versión de la spec (`"0.1"`). Compatibilidad por versión mayor |
| `name` | string | sí | Nombre del proyecto (para humanos) |
| `blueprint` | string | sí | Tipo de proyecto. En 0.1: `blog` \| `cuento` |
| `language` | string | no (def. `es`) | Código BCP 47 del idioma principal |
| `createdAt` | string | no | Fecha ISO 8601 de creación |

Campos desconocidos se preservan y se ignoran (compatibilidad hacia delante).

## Documentos (`contenido/**/*.md`)

- Codificación UTF-8, saltos de línea `\n` preferidos (`\r\n` tolerado al leer).
- Frontmatter YAML opcional delimitado por `---`. Campos comunes en 0.1: `title`,
  `estado`, `tags`. Los Blueprints definirán campos propios en el hito M2 y se
  documentarán aquí.
- Archivos y carpetas cuyo nombre empieza por `.` no forman parte del contenido.

## Reservado para versiones futuras

Nombres reservados que las herramientas no deben usar para otra cosa: carpeta
`colecciones/` (fichas con esquema, M2), `.verne/crdt/` y `.verne/sync.yaml`
(colaboración, si su disparador llega — RFC-0002 §8), `.verne/index.db` y
`.verne/history/` (índice y snapshots).
