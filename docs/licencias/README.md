# Licencias de terceros

Verne se distribuye bajo [AGPL-3.0](../../LICENSE). Esto recoge lo que incluye y que
tiene autoría y licencia propias, con lo que sus licencias obligan a decir.

## Diccionario de español

**Qué es:** el diccionario para corrección ortográfica que Verne usa en la capa 1 del
análisis (RFC-0004). Son dos archivos de datos: las reglas de afijos y la lista de
palabras.

**Dónde está:** [`apps/desktop/public/diccionarios/es/`](../../apps/desktop/public/diccionarios/es/),
junto a su texto de licencia completo, y se distribuye con la aplicación.

**Autoría:** desarrollado inicialmente por **Santiago Bosio**, que coordina el desarrollo
de los diccionarios localizados de LibreOffice y Apache OpenOffice en español. Versión 2.8.
Es un desarrollo original, no derivado de adaptaciones anteriores.

**Empaquetado por:** Titus Wormer (wooorm), en
[`dictionaries`](https://github.com/wooorm/dictionaries/tree/main/dictionaries/es), de donde
se tomaron los archivos.

**Licencia:** triple esquema disjunto — **GNU GPL-3.0 o posterior**, **GNU LGPL-3.0 o
posterior**, o **MPL-1.1 o posterior**. Quien lo usa elige.

**La opción que toma Verne: LGPL-3.0.** Permite distribuir los datos junto a la aplicación
sin extender condiciones al resto del código, y es compatible con la AGPL-3.0 del
repositorio. Los archivos no se modifican: se distribuyen tal cual, con su licencia al lado.

Los archivos están incorporados al repositorio en lugar de tomarse del paquete npm en cada
instalación, por dos razones: el `exports` del paquete no permite importar los archivos
sueltos, y tener los datos y su licencia a la vista en el repositorio hace evidente qué se
está redistribuyendo.

## Bibliotecas

Las dependencias de código (ProseMirror, nspell, React, Tauri y las demás) llevan cada una
su licencia en `node_modules` y no se redistribuyen como archivos aparte, sino compiladas en
el paquete. Todas son permisivas (MIT, Apache-2.0 o ISC); `pnpm licenses list` da el detalle
en cualquier momento.
