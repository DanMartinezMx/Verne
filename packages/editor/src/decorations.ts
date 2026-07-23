import type { Node } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

/**
 * API de decoraciones en línea del editor: infraestructura reutilizable
 * (RFC-0001 §7.2). La UI habla en offsets de TEXTO PLANO — la proyección que
 * devuelve `getPlainText` — y el editor los traduce a posiciones de ProseMirror.
 * Hoy la usan los subrayados de calidad; mañana, comentarios, búsqueda
 * resaltada y los analizadores como plugins, sin filtrar ProseMirror afuera.
 */
export interface InlineDecoration {
  /** Offset inicial (inclusive) en la proyección de texto plano. */
  from: number;
  /** Offset final (exclusivo) en la proyección de texto plano. */
  to: number;
  /** Clase CSS aplicada al tramo. */
  className: string;
  /** Texto mostrado al pasar el cursor (atributo title). */
  title?: string;
}

/** Separador entre bloques en la proyección: dos saltos, como un párrafo. */
const BLOCK_SEPARATOR = "\n\n";

const decorationsKey = new PluginKey<DecorationSet>("verne-inline-decorations");

/** Meta para reemplazar el juego de decoraciones en una transacción. */
interface SetDecorationsMeta {
  decorations: Decoration[];
}

export function inlineDecorationsPlugin(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: decorationsKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, set) {
        const meta = tr.getMeta(decorationsKey) as SetDecorationsMeta | undefined;
        if (meta) return DecorationSet.create(tr.doc, meta.decorations);
        // Sin meta: seguimos las decoraciones a través de la edición del usuario.
        return set.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations(state) {
        return decorationsKey.getState(state);
      },
    },
  });
}

interface TextSegment {
  /** Offset en la proyección donde empieza este nodo de texto. */
  offset: number;
  /** Longitud del texto del nodo. */
  length: number;
  /** Posición ProseMirror del primer carácter del nodo. */
  pos: number;
}

interface Projection {
  text: string;
  segments: TextSegment[];
}

/**
 * Recorre el documento una sola vez construyendo a la par (1) la proyección de
 * texto plano y (2) el mapa de tramos de texto → posiciones ProseMirror, para
 * que ambos queden garantizados consistentes.
 */
function buildProjection(doc: Node): Projection {
  const segments: TextSegment[] = [];
  let text = "";
  let firstBlock = true;
  doc.descendants((node, pos) => {
    if (node.isTextblock) {
      if (!firstBlock) text += BLOCK_SEPARATOR;
      firstBlock = false;
      node.forEach((child, childOffset) => {
        if (child.isText && child.text) {
          segments.push({ offset: text.length, length: child.text.length, pos: pos + 1 + childOffset });
          text += child.text;
        }
      });
      return false; // el contenido en línea ya lo recorrimos aquí
    }
    return true;
  });
  return { text, segments };
}

/** El texto plano del documento, base común de análisis y decoraciones. */
export function getPlainText(doc: Node): string {
  return buildProjection(doc).text;
}

/**
 * Traduce un rango de offsets de texto a uno o varios rangos ProseMirror
 * (un rango puede cruzar varios nodos de texto, p. ej. una palabra en negrita
 * dentro de una frase). Las posiciones son contiguas, así que casi siempre es
 * un solo tramo.
 */
function mapOffsetRange(
  from: number,
  to: number,
  segments: TextSegment[],
): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const seg of segments) {
    const segEnd = seg.offset + seg.length;
    const start = Math.max(from, seg.offset);
    const end = Math.min(to, segEnd);
    if (start < end) {
      ranges.push([seg.pos + (start - seg.offset), seg.pos + (end - seg.offset)]);
    }
  }
  return ranges;
}

/**
 * Convierte decoraciones expresadas en offsets de texto en decoraciones
 * ProseMirror sobre `doc`. Fusiona tramos ProseMirror adyacentes que provienen
 * del mismo rango de texto para no cortar el subrayado en las fronteras de marca.
 */
export function buildDecorations(doc: Node, decorations: InlineDecoration[]): Decoration[] {
  const { segments } = buildProjection(doc);
  const out: Decoration[] = [];
  for (const deco of decorations) {
    if (deco.to <= deco.from) continue;
    const attrs = deco.title
      ? { class: deco.className, title: deco.title }
      : { class: deco.className };
    for (const [pmFrom, pmTo] of mapOffsetRange(deco.from, deco.to, segments)) {
      out.push(Decoration.inline(pmFrom, pmTo, attrs));
    }
  }
  return out;
}

/** Meta-clave y constructor de meta para que el editor despache el cambio. */
export function setDecorationsMeta(doc: Node, decorations: InlineDecoration[]) {
  return { key: decorationsKey, value: { decorations: buildDecorations(doc, decorations) } };
}
