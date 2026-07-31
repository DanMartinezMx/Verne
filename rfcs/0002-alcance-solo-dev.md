# RFC-0002 — Alcance v0.x: la ruta solo-dev

| Campo | Valor |
|---|---|
| Estado | Aceptado (decisión del maintainer) |
| Tipo | Enmienda de alcance y stack sobre RFC-0001 |
| Fecha | 2026-07-21 |
| Relación | RFC-0001 sigue siendo el mapa a 10 años; este RFC define la ruta real para v0.x |

---

## 0. Contexto y motivación

RFC-0001 diseña Verne para un equipo de 3–5 personas durante 2–3 años. La realidad del
proyecto es otra, y este documento la hace oficial:

- **Un solo maintainer**, que construye Verne primero **para sí mismo**: escribe entradas de
  blog y cuentos, en **Windows**.
- **Open source desde el primer commit, sin expectativa de comunidad.** Modelo de gobierno:
  dictador benevolente (ver §7). La comunidad, si llega, será consecuencia del producto, no
  un requisito del plan.
- **Desarrollo asistido por IA.** El maintainer programa en pareja con un agente de código.
  Esto multiplica la velocidad, pero no cambia una regla de mantenimiento a 10 años:
  **no entra en `main` código que el maintainer no pueda explicar y depurar por sí mismo.**
  La IA acelera; la responsabilidad y la comprensión no se delegan.

El principio rector de este RFC es el P7 (simplicidad primero) aplicado al propio plan:
la versión que existe y se usa a diario vale más que la arquitectura perfecta que nunca se
termina. El anti-modelo sigue siendo Manuskript (RFC-0001 §3.5) — y un solo-dev está más
expuesto a ese destino que nadie.

---

## 1. Qué enmienda este RFC sobre RFC-0001

Los principios P1–P17 y el formato VPF **no cambian**. Cambian decisiones de stack, orden y
alcance. Referencias al índice de decisiones de RFC-0001 (Apéndice B):

| Decisión RFC-0001 | Estado en v0.x | Detalle |
|---|---|---|
| D1 — Kernel Rust / UI TS | **Suspendida** | Todo TypeScript (Alternativa A de §19.2, prevista para este caso en §19.1.1). La frontera kernel/UI se conserva como frontera de paquetes TS. Rust podrá entrar después, pieza a pieza, si algo lo justifica con medidas (§8) |
| D2 — React con cortafuegos | Vigente | Sin cambios |
| D3 — Tauri | Vigente y **reforzada** | Windows-first usa WebView2 (Chromium evergreen): el riesgo WebKitGTK de §5.3 no aplica a v0.x |
| D4 — ProseMirror directo | Vigente | Sin cambios; es de las decisiones caras de revertir |
| D5 — Archivos como verdad + SQLite derivado | Vigente | Innegociable; es lo que hace baratas todas las demás suspensiones |
| D6 — CRDT permanente desde fase 2 | **Suspendida** | v0.x edita ProseMirror→Markdown sin capa CRDT. Justificación y condición de reactivación en §3.1 |
| D7 — Sandbox de plugins | **Aplazada** | No hay sistema de plugins en v0.x; la disciplina de API se conserva (§4.3) |
| D8 — 3 Blueprints núcleo | **Modificada** | Dos: **Blog** y **Cuento**. Documentación cae a futura semilla comunitaria |
| D9 — IA solo-análisis tras pasarela | Aplazada | Sin módulo de IA en v0.x; P3 se cumple trivialmente (no hay IA) |
| D10 — Licencias por capa | **Resuelta para v0.x** | Ver §7.2 |
| Roadmap de 9 fases | **Sustituido** | Hitos M0–M4 (§6) mientras el proyecto sea solo-dev |
| Gobernanza §18 (RFC formal, roles, supermayorías) | **Aplazada** | Dictador benevolente (§7.1). Los RFC se mantienen solo como registro de decisiones grandes del maintainer |
| Multiplataforma (6 targets) | **Reducida** | Windows primero; macOS/Linux cuando cueste poco (Tauri compila a los tres); web como puerta de entrada futura, nunca como hogar de los datos; móvil fuera de v0.x |

---

## 2. Alcance de producto v0.1

v0.1 es **la app que su maintainer necesita a diario**: escribir, organizar y publicar
entradas de blog; escribir, revisar y enviar cuentos. Nada más.

### 2.1 Blueprint Blog

- Estructura de flujo: **ideas → borradores → publicadas** (estados, no carpetas rígidas).
- Colecciones mínimas: categorías/etiquetas y series.
- Metadatos por entrada (frontmatter): título, slug, estado, fecha, etiquetas, extracto.
- Exportación: **Markdown/HTML limpios listos para pegar o subir a cualquier CMS o SSG**.
  Integraciones directas (WordPress, Ghost, Hugo…) quedan para después — el portapapeles y
  la carpeta de salida son la integración universal de v0.1.
- Métricas: recuento de palabras, cadencia de publicación simple.

### 2.2 Blueprint Cuento

- Estructura: un proyecto puede contener varios cuentos; cada cuento es un documento (o
  pocos), con estado editorial (idea, borrador, revisión, terminado, enviado).
- Colección mínima: **envíos** (a qué revista/concurso se mandó cada cuento, cuándo, respuesta) —
  la ficha que todo cuentista lleva hoy en una hoja de cálculo.
- Fichas de personaje ligeras: opcionales, como colección simple; sin worldbuilding pesado
  (eso es territorio del futuro Blueprint Novela).
- Exportación: **DOCX en formato de manuscrito estándar** (el formato que piden revistas y
  concursos) y PDF simple.
- Métricas: palabras por sesión, longitud objetivo por cuento.

### 2.3 Común a ambos

- Editor ProseMirror con esquema de prosa, **modo enfoque** (P14), atajos completos de
  teclado (P11), autosave y snapshots locales de seguridad.
- Árbol de proyecto, búsqueda global (SQLite FTS), papelera.
- Proyectos en formato **VPF** (RFC-0001 §6): carpeta + Markdown + `verne.yaml`. La prueba
  "borrar `.verne/` no pierde nada" entra en CI desde M1.
- Tema claro/oscuro, escalado de fuente.

---

## 3. Fuera de alcance v0.x (y por qué es seguro aplazarlo)

| Aplazado | Sustituto en v0.x | Por qué es seguro |
|---|---|---|
| Sincronización propia (CRDT, relay) | **git o Syncthing sobre la carpeta del proyecto** — soportado y documentado oficialmente | VPF es texto plano en carpetas: las herramientas genéricas funcionan hoy. El CRDT se reconstruye desde los archivos si algún día llega la colaboración |
| Sistema de plugins + sandbox | Los módulos internos respetan la frontera de API (§4.3) | La disciplina de frontera es lo único que no se puede retroadaptar; el sandbox sí |
| IA (análisis capa 4) | Nada | P3: Verne sin IA es Verne completo |
| Análisis capas 1–3 | Solo recuentos y ortografía del propio WebView2 en v0.1 | El pipeline de RFC-0001 §11 llega en v0.3+ (§6) |
| macOS/Linux/web/móvil | Windows | Tauri deja macOS/Linux a un coste marginal cuando haya usuarios que los pidan |
| Blueprint Documentación/Novela/Guion… | — | §19.5.1 de RFC-0001, aplicado con más dureza aún |

### 3.1 La suspensión de D6 (CRDT), en detalle

RFC-0001 argumenta que retroadaptar CRDT es el error histórico de la categoría. Sigue siendo
cierto **para colaboración en vivo**. Lo que cambia: en un proyecto personal mono-usuario,
multi-dispositivo se resuelve con git/Syncthing sobre texto plano, y el riesgo real de
retroadaptación queda acotado porque (a) los archivos Markdown son la fuente de verdad (D5),
así que una futura capa CRDT puede *nacer* de los archivos, y (b) `@verne/editor` encapsula
ProseMirror, así que añadir el binding y-prosemirror después es un cambio local, no un
rediseño. **Condición de reactivación:** en cuanto exista un segundo escritor colaborando en
un mismo proyecto como caso de uso real, D6 se reactiva antes de construir cualquier función
de colaboración.

---

## 4. Stack v0.x

### 4.1 Decisiones

- **TypeScript en todo.** Un lenguaje, un runtime mental, máxima velocidad solo-dev.
- **Tauri 2 + WebView2** como shell de Windows. El Rust de Tauri en v0.x es pegamento
  generado y configuración, no un kernel: capacidades del sistema (archivos, diálogos,
  vigilancia de carpeta) vía plugins oficiales de Tauri.
- **ProseMirror** en `@verne/editor`, sin React dentro del paquete.
- **SQLite** como índice derivado (FTS5 incluido), archivos como verdad (D5 intacta).
- **React** en la UI, con la regla de RFC-0001 §5.2: cero estado de dominio en React.

### 4.2 Estructura del repo v0.x (subconjunto del monorepo de RFC-0001 §14)

```text
verne/
├── packages/
│   ├── core/          # "Kernel" TS: proyecto VPF, índice, búsqueda, eventos, comandos
│   ├── editor/        # ProseMirror + esquemas + round-trip Markdown (sin React)
│   ├── blueprints/    # blog/ y cuento/ como módulos internos con manifiesto
│   ├── export/        # AST de exportación → MD, HTML, DOCX, PDF
│   └── ui/            # Componentes React accesibles + shell de la app
├── apps/
│   └── desktop/       # Tauri (Windows; macOS/Linux latentes)
├── examples/          # Un proyecto VPF de blog y uno de cuentos (fixtures de tests)
├── rfcs/
└── docs/spec/vpf/     # La spec VPF v0 se escribe con el código, no después
```

Los directorios `crates/`, `plugins/`, `blueprints/` (top-level) y `apps/web|mobile` de
RFC-0001 §14 se crearán cuando sus fases se activen; el layout está diseñado para crecer
hacia aquel sin mover lo existente.

### 4.3 La disciplina que compra el futuro

Tres reglas baratas hoy que mantienen vivo el mapa de RFC-0001:

1. **La UI no contiene lógica de dominio.** Todo pasa por comandos/consultas/eventos de
   `core` (RFC-0001 §4.2), aunque emisor y receptor sean el mismo proceso TS.
2. **Los Blueprints consumen la misma API interna** que un plugin consumiría. Cuando llegue
   el sistema de plugins, la API ya existirá porque Blog y Cuento la habrán forzado.
3. **Nada importa ProseMirror fuera de `packages/editor`,** ni SQLite fuera de `core`.

---

## 5. Formato VPF v0

Idéntico a RFC-0001 §6 en principios y layout, con alcance reducido: sin `.verne/crdt/`
(D6 suspendida) y sin `sync.yaml`. `.verne/` contiene solo `index.db` (regenerable) y
`history/` (snapshots). La spec en `docs/spec/vpf/` versiona este subconjunto como **VPF 0.x**
y declara explícitamente los campos reservados para sync/CRDT, de modo que un proyecto v0.x
sea abrible sin migración por cualquier versión futura.

---

## 6. Roadmap solo-dev: hitos, no fases

Sin fechas — con criterios. Cada hito termina cuando su criterio se cumple, y el criterio
siempre incluye uso real del maintainer (dogfooding como brújula).

- **M0 — Esqueleto.** Monorepo pnpm, CI (build Windows + tests + prueba "borrar `.verne/`"),
  app Tauri que abre/crea un proyecto VPF y muestra su árbol.
  *Salida:* el maintainer crea su proyecto de blog real con la app.
- **M1 — Editor.** ProseMirror + esquema de prosa, round-trip Markdown sin pérdida (suite de
  tortura desde el primer día), autosave, snapshots, modo enfoque, atajos.
  *Salida:* **el maintainer escribe su siguiente entrada de blog completa en Verne** y el
  round-trip no pierde un solo carácter en la suite.
- **M2 — Organización + Blueprints.** Estados y metadatos, colecciones mínimas (etiquetas,
  envíos), búsqueda global, papelera, los dos Blueprints diferenciados de verdad (P6: el
  proyecto de blog y el de cuentos se ven y se comportan distinto).
  *Salida:* toda la escritura del maintainer (blog y cuentos) vive en Verne; la hoja de
  cálculo de envíos queda retirada.
- **M3 — Exportación.** MD/HTML limpio (blog), DOCX manuscrito estándar y PDF (cuento),
  perfiles mínimos por Blueprint.
  *Salida:* una entrada publicada realmente y un cuento enviado realmente a una revista,
  ambos exportados desde Verne sin retoques manuales.
- **M4 = v0.1 pública.** Instalador Windows firmado si es viable, README honesto (qué hace y
  qué no), guía de git/Syncthing para multi-dispositivo, devlog de lanzamiento.
  *Salida:* un desconocido instala Verne y escribe sin ayuda del maintainer.

**Después de v0.1**, en orden tentativo y siempre por dolor real, no por roadmap: v0.2
pulido + macOS/Linux si hay demanda → v0.3 análisis capas 1–2 (Hunspell/LanguageTool,
RFC-0001 §11) → v0.4+ sistema de plugins **solo si** aparecen las ganas/la demanda (§8).

---

## 7. Gobernanza y licencia

### 7.1 Dictador benevolente, por escrito

- El maintainer decide. No hay promesa de aceptar PRs ni SLA de respuesta a issues.
- `CONTRIBUTING.md` lo dice con amabilidad y sin ambigüedad (añadido en este mismo cambio).
- Los RFC siguen existiendo como **registro de decisiones** (qué se decidió y por qué), no
  como proceso de aprobación comunitaria. El proceso formal de RFC-0001 §18 se activará solo
  si algún día hay múltiples maintainers.
- Issues bienvenidos; el devlog público es el canal principal de comunicación.

### 7.2 Licencia (cierra el pendiente de RFC-0001 §19.5.4 para v0.x)

- **v0.x: AGPL-3.0 para todo el repositorio** (la licencia ya presente). Mientras el
  maintainer sea el único autor con copyright, conserva la libertad de relicenciar partes.
- **Compromiso registrado aquí:** cuando se extraigan el SDK de plugins, `contracts/` y las
  bibliotecas de lectura del formato VPF, se publicarán bajo **MIT o Apache-2.0**, conforme
  al razonamiento de RFC-0001 §19.5.4 (el formato abierto no debe imponer copyleft a otras
  herramientas que lo implementen).
- Si se aceptan contribuciones externas sustanciales antes de esa extracción, se pedirá DCO
  (`Signed-off-by`) para mantener limpia esa futura relicencia parcial.

---

## 8. Condiciones de reactivación del mapa RFC-0001

Cada pieza suspendida tiene un disparador objetivo. Sin disparador, no se construye:

| Pieza | Se reactiva cuando… |
|---|---|
| CRDT + sync propia (D6, fases 5) | Exista colaboración real entre dos personas en un proyecto, o el modo git/Syncthing genere pérdidas documentadas que el diseño actual no pueda evitar |
| Sistema de plugins + sandbox (D7) | Terceros pidan extender Verne de formas concretas ≥3 veces, o el propio maintainer sienta la fricción de no poder instalar/quitar módulos |
| Rust en el núcleo (D1) | Un cuello de botella medido (índice, búsqueda, exportación) que TS no alcance tras optimizar, o el salto a móvil/web exija compartir kernel compilado |
| ~~macOS y Linux~~ | **Disparador cumplido** (v0.3.1, 2026-07-30): el propio maintainer usa macOS y no podía correr su app. Tauri compila a los tres sin tocar el Rust; la matriz de CI construye los tres paquetes. Sin firmar todavía, en ninguna plataforma |
| Web y móvil | Solo tras v0.3. **Móvil evaluado y aplazado** en RFC-0003 §8, con lo aprendido registrado |
| Gobernanza formal (§18) | Un segundo maintainer sostenido en el tiempo |
| ~~Blueprint Novela~~ | **Disparador cumplido** (RFC-0003 §3, 2026-07-30): el maintainer escribe novela corta y larga en Verne. Un solo Blueprint `novela` parametrizado por meta de palabras |

---

## 9. Riesgos específicos de la ruta solo-dev

| Riesgo | Mitigación |
|---|---|
| Abandono por vida (el riesgo nº 1 de todo solo-dev) | Hitos pequeños con recompensa de uso propio inmediata; el proyecto es útil desde M1, no desde v1.0 |
| Scope creep ("ya que estoy, le añado…") | La tabla §3 y los disparadores §8 son el contrato; cada idea nueva se anota en `rfcs/ideas.md` y espera |
| Código generado por IA que el maintainer no domina | Regla de §0: nada entra en `main` sin comprensión del maintainer; tests como red; preferir código aburrido y explícito a código listo |
| Deriva de la disciplina de frontera (§4.3) con la velocidad de la IA | Lint de imports en CI desde M0 (prohibir ProseMirror fuera de `editor`, SQLite fuera de `core`, lógica en `ui`) — la regla la vigila una máquina, no la fuerza de voluntad |
| Soledad del proyecto (sin feedback) | Devlog público desde M0; v0.1 se enseña pronto aunque esté imperfecta |

---

## 10. Definición de éxito de esta etapa

> **Verne es la única aplicación en la que su maintainer escribe.**

Si dentro de un año cada entrada de blog y cada cuento del maintainer nace, vive y se exporta
desde Verne, esta etapa habrá triunfado — haya o no una sola estrella en GitHub. Todo lo
demás (comunidad, plataformas, plugins, la visión completa de RFC-0001) se construye encima
de ese cimiento o no se construye.

---

*Registro de decisión del maintainer conforme a §7.1. Comentarios bienvenidos en el issue
tracker; la decisión puede revisarse con datos, como todas.*
