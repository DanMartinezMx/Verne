import { InputRule } from "prosemirror-inputrules";
import type { EditorState, Transaction } from "prosemirror-state";
import { proseSchema } from "./markdown.js";

/**
 * Encabezado de escena de guion: `INT.`, `EXT.`, `INT./EXT.` o `I/E.` al
 * principio de una línea. Es la convención del formato, y escribirla debería
 * bastar para que la línea SEA una escena.
 *
 * Se acepta con o sin punto final (`INT ` también), porque quien escribe guion
 * teclea rápido.
 */
export const SCENE_RE = /^(INT\.?\/EXT\.?|I\/E\.?|INT\.?|EXT\.?)\s$/i;

/**
 * Convierte el párrafo en encabezado de nivel 2 SIN tocar el texto escrito, o
 * devuelve null si no toca hacerlo.
 *
 * Conservar el texto es la diferencia con `textblockTypeInputRule`, que sustituye
 * lo que coincide: ahí "INT. " desaparecería y la escena se quedaría sin su
 * propio prefijo. Aquí solo cambia el tipo de bloque, así que al guardar sale
 * `## INT. CASA — NOCHE`, la convención que ya documentaba el espacio Guion.
 *
 * ponytail: esto NO es un esquema de guion (Fountain). El round-trip Markdown es
 * el activo más caro del repo y un esquema propio no cabe en esta versión; esta
 * regla da el gesto por veinte líneas. La deuda está anotada en rfcs/ideas.md.
 */
export function applySceneHeading(
  state: EditorState,
  start: number,
  end: number,
): Transaction | null {
  const $start = state.doc.resolve(start);
  if ($start.parent.type !== proseSchema.nodes.paragraph) return null;
  // Solo un párrafo suelto del documento. Dentro de una cita (el diálogo del
  // guion) o de una lista, `parent` TAMBIÉN es un párrafo: hay que mirar la
  // profundidad, o teclear "INT. " en un diálogo lo convertiría en encabezado.
  if ($start.depth !== 1) return null;
  return state.tr.setBlockType(start, end, proseSchema.nodes.heading, { level: 2 });
}

export function sceneHeadingRule(): InputRule {
  return new InputRule(SCENE_RE, (state, _match, start, end) =>
    applySceneHeading(state, start, end),
  );
}
