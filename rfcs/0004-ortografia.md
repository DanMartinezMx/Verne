# RFC-0004 — Ortografía: la capa 1 del análisis

| Campo | Valor |
|---|---|
| Estado | Aceptado (decisión del maintainer) |
| Tipo | Activación de la capa 1 del pipeline de análisis (RFC-0001 §11) |
| Fecha | 2026-07-30 |
| Relación | Cumple el siguiente paso declarado en RFC-0002 §6; no enmienda nada |

---

## 0. Contexto

RFC-0001 §11 diseña el análisis en cuatro capas, con una regla: **una capa superior nunca
hace el trabajo de una inferior** (la IA no corrige tildes). Verne tiene hoy la capa 2
parcial —legibilidad, repeticiones, frases largas, adverbios en -mente, muletillas, todo
con reglas propias— y **no tiene capa 1**. RFC-0002 §2.3 lo dejó explícito: en v0.1 la
ortografía era «la del propio WebView2».

Eso ya no se sostiene, y v0.3.1 lo empeoró sin querer:

- **No hay ningún `spellcheck` declarado** en el código. Lo decide el WebView.
- En Windows (WebView2) y macOS (WKWebView) hay corrector del sistema por defecto.
- En Linux, **WebKitGTK necesita `enchant` más un backend de hunspell instalados**. En una
  máquina sin ellos no hay corrector ninguno, y Verne no se enteraría.

Es decir: acabamos de publicar en tres plataformas una app cuya ortografía se comporta de
tres maneras distintas, una de ellas «no existe». Y en las tres, Verne no sabe qué palabras
están mal: no puede explicar, ni sugerir, ni aprender un nombre de personaje. Nada de eso
cumple P16 («los diagnósticos enseñan»).

---

## 1. Decisiones

| # | Decisión | Resumen |
|---|---|---|
| **D17** | **Corrector propio, no el del sistema** | Verne comprueba la ortografía él mismo, igual en las tres plataformas, y sabe qué palabra falla |
| **D18** | **nspell (JS puro), no Hunspell en WASM** | Sin binarios en el bundle, sin inicialización asíncrona de WASM, y suficiente para español según lo medido (§3) |
| **D19** | **Diccionario `dictionary-es`, bajo su opción LGPL-3.0** | Del proyecto RLA-es, empaquetado por wooorm. Tri-licencia; se toma LGPL-3.0 y se atribuye |
| **D20** | **Las palabras propias viven en `diccionario.txt` del proyecto** | Fuera de `.verne/`, que es prescindible por contrato: los nombres de tus personajes no son estado derivado |
| **D21** | **El tokenizado es parte del problema, no un detalle** | La raya de diálogo del español (`—`) pegada a la palabra generaría un falso positivo por línea de diálogo |

---

## 2. Por qué un corrector propio y no el del WebView (D17)

El del sistema es gratis y ya está ahí, así que merece defensa explícita descartarlo:

- **No hay API para enumerar los errores.** El WebView subraya, pero no le dice a la
  aplicación qué palabras están mal. Sin eso no hay panel de ortografía, ni «añadir al
  diccionario», ni recuento, ni nada que Verne pueda explicar.
- **No es el mismo en las tres plataformas**, y en Linux puede no estar (§0).
- **No aprende del proyecto.** Un novelista escribe «Amelia» trescientas veces; el
  diccionario del sistema es del usuario, no del proyecto, y no viaja con la carpeta.

Se mantiene el `spellcheck` nativo del WebView **desactivado** en el editor una vez exista
el propio, para no tener dos subrayados discrepantes sobre la misma palabra.

---

## 3. Por qué nspell y no Hunspell en WASM (D18)

Se midió antes de decidir, con el diccionario real y palabras de ficción en español:

| Grupo | Resultado |
|---|---|
| Palabras y flexiones comunes | 10/11 correctas |
| Enclíticos simples (`dime`, `cuéntame`, `hazlo`) | 7/7 |
| Enclíticos dobles (`dámelo`, `dárselo`) | 5/6 |
| Gerundio + enclítico (`mirándola`, `volviéndose`) | 4/4 |
| Errores reales detectados | 5/5, con buenas sugerencias (`murcielago` → `murciélago`, `aviéndose` → `viéndose`) |

Carga del diccionario: **~520 ms una vez**. Comprobación: **20.000 palabras en 2 ms**. El
rendimiento no es un problema, así que no hay motivo medido para meter un binario WASM
(D1 de RFC-0001 sigue suspendida por la misma regla: sin cuello de botella medido, no).

**Limitación conocida y aceptada:** los enclíticos triples con desplazamiento de tilde
fallan (`corrigiéndoselo` se marca como error). Es una familia estrecha, el escritor la
añade una vez a su diccionario, y la salida —si algún día molesta— es Hunspell en WASM sin
cambiar nada más: la interfaz `Speller` de core no menciona nspell.

---

## 4. Licencia del diccionario (D19)

`dictionary-es` empaqueta el diccionario del proyecto **RLA-es** (Recursos Lingüísticos
Abiertos del Español) con **tri-licencia GPL-3.0 OR LGPL-3.0 OR MPL-1.1**.

Se toma la opción **LGPL-3.0**: permite distribuir los datos junto a la aplicación sin
imponer condiciones adicionales sobre el resto del código, y es compatible con la AGPL-3.0
del repositorio. Obligaciones que se cumplen: **atribución visible** y **el texto de la
licencia distribuido con la app** (`docs/licencias/`), además de mencionarlo en el README.

No se incluye el diccionario en el bundle de JavaScript: son 167 KB de reglas y 706 KB de
palabras que se cargan como **recurso aparte y solo cuando la ortografía está encendida**.
Arrancar Verne no debe costar un megabyte de diccionario que quizá nadie use.

---

## 5. `diccionario.txt`: las palabras del proyecto (D20)

Un archivo de texto en la raíz del proyecto, una palabra por línea.

**Por qué no en `.verne/`:** esa carpeta es prescindible por contrato VPF —borrarla nunca
pierde nada, y hay un test permanente que lo garantiza. Los nombres de los personajes de
una novela **no son estado derivado**: son trabajo del escritor. Si vivieran ahí, borrar
una carpeta que la spec declara desechable perdería trescientas decisiones.

Vivir en la raíz además le da lo que necesita gratis: viaja con la carpeta al copiarla,
se versiona con git, se sincroniza con Syncthing y se edita con cualquier editor.

---

## 6. El tokenizado (D21)

En español el diálogo se marca con **raya** (`—`), no con guion ni con comillas inglesas:

```
—Otra vez llegas tarde.
```

Si el tokenizador parte por espacios, la primera palabra de cada línea de diálogo es
`—Otra`, que no está en ningún diccionario. **Una novela son miles de líneas de diálogo**:
el resultado sería un subrayado rojo por línea y la función acabaría apagada para siempre.

Se recortan de los bordes de cada palabra: raya (`—`), guion largo (`–`), comillas latinas
(`«»`), inglesas (`""` y `''`), apertura de interrogación y exclamación (`¿¡`), y la
puntuación normal. Se conserva lo que va **dentro** de la palabra: el apóstrofo y el guion
interior de `veinti-algo` o `M'hijo`.

Tampoco se comprueba lo que no es prosa: URLs, código entre acentos graves, y palabras con
dígitos.

---

## 7. Alcance

**Entra:** subrayado ondulado en vivo con la sugerencia al pasar el cursor, un panel de
Ortografía que lista las palabras desconocidas con su recuento y un botón para añadirlas al
diccionario del proyecto, y el interruptor para apagarlo todo.

**No entra:** menú contextual de corrección con clic derecho (exige que el editor exponga
clics sobre decoraciones, y el panel resuelve el caso del novelista mejor: añadir los diez
nombres de una vez en lugar de uno por aparición); gramática y estilo mecánico con
LanguageTool (**es capa 2, su propio hito**); y cualquier otro idioma que no sea español
hasta que alguien escriba en otro.

---

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| Falsos positivos que hacen apagar la función | El tokenizado se trata como parte del problema (§6) y tiene tests con diálogo real; los nombres se añaden una vez y viajan con el proyecto |
| Los 873 KB del diccionario molestan al arrancar | Se cargan solo al encender la ortografía, y una vez por sesión |
| La tri-licencia se interpreta mal | La opción tomada, el motivo y el texto quedan por escrito (§4) y distribuidos |
| nspell se queda corto en español | La interfaz `Speller` no menciona nspell: cambiarlo por Hunspell en WASM es sustituir una implementación, no rediseñar |

---

## 9. Definición de éxito

> El maintainer escribe un capítulo con diálogo y nombres propios, y la ortografía **no
> estorba**: no subraya el diálogo, aprende los nombres una vez, y cuando marca algo tiene
> razón.

Si acaba apagándola, el RFC falló — y el motivo estará en los falsos positivos, no en la
cobertura del diccionario.

---

*Registro de decisión del maintainer conforme a RFC-0002 §7.1.*
