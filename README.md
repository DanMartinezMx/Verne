# Verne

**Un sistema operativo para escritores.** Libre, open source y local-first.

Verne es una plataforma para escribir cualquier tipo de contenido — novelas, blogs,
documentación, guiones, newsletters, notas — donde el editor es solo uno de los módulos.
Cada tipo de proyecto adapta automáticamente la interfaz y las herramientas: quien escribe
un blog nunca ve fichas de personajes; quien escribe una novela nunca ve puntuaciones SEO.

## Principios (resumen)

- **Tus datos son tuyos:** archivos Markdown en carpetas normales, formato abierto y
  especificado. Borrar Verne nunca borra ni vuelve ilegible tu obra.
- **Local-first:** todo funciona sin Internet, para siempre. La sincronización es opcional,
  cifrada de extremo a extremo y autoalojable.
- **La IA es opcional y nunca escribe por ti:** analiza, señala y explica; modelos locales
  primero.
- **Núcleo pequeño, todo lo demás es plugin** — incluidas nuestras propias funciones.
- **La aplicación te enseña a escribir mejor:** no solo corrige, explica el porqué.

## Estado del proyecto

Fase de diseño, camino de la v0.1. Verne es el proyecto personal de un solo maintainer,
construido primero para su propio uso (blog y cuentos, en Windows) y abierto desde el primer
día. Las decisiones grandes quedan registradas con su razonamiento en [`rfcs/`](rfcs/):

- **[RFC-0001: Visión, Arquitectura y Roadmap](rfcs/0001-vision-y-arquitectura.md)** — el
  mapa a 10 años: arquitectura completa, plugins, sincronización, IA, multiplataforma.
- **[RFC-0002: Alcance v0.x, la ruta solo-dev](rfcs/0002-alcance-solo-dev.md)** — el plan
  real y vigente: qué se construye ahora, qué se aplaza y qué lo reactivaría.

¿Quieres contribuir o entender cómo se gobierna el proyecto? Lee
[CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

[AGPL-3.0](LICENSE) para todo el repositorio en v0.x. Cuando existan el SDK de plugins y las
bibliotecas del formato VPF, se publicarán bajo MIT/Apache-2.0 para que cualquier herramienta
pueda implementar el formato (razonamiento en RFC-0001 §19.5.4 y RFC-0002 §7.2).
