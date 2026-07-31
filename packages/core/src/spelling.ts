import nspell from "nspell";
import type { InlineFinding } from "./analyze.js";

/**
 * Capa 1 del análisis: ortografía (RFC-0004).
 *
 * core no lee archivos, así que no carga el diccionario: lo recibe ya leído,
 * igual que recibe el sistema de archivos. Eso también deja la puerta abierta a
 * cambiar nspell por Hunspell en WASM sin tocar a quien lo usa: `Speller` no
 * menciona la implementación.
 */

/** Diccionario Hunspell: reglas de afijos y lista de palabras. */
export interface Dictionary {
  aff: string;
  dic: string;
}

export interface Speller {
  /** ¿Está bien escrita? */
  correct(word: string): boolean;
  /** Sugerencias, de la más probable a la menos. */
  suggest(word: string): string[];
}

/**
 * Crea el corrector. `extraWords` son las palabras del proyecto (nombres de
 * personajes y lugares inventados): sin ellas, una novela sale subrayada entera.
 */
export function createSpeller(dictionary: Dictionary, extraWords: readonly string[] = []): Speller {
  const spell = nspell(dictionary.aff, dictionary.dic);
  for (const word of extraWords) {
    const clean = word.trim();
    if (clean !== "") spell.add(clean);
  }
  return {
    correct: (word) => spell.correct(word),
    suggest: (word) => spell.suggest(word),
  };
}

/**
 * Signos que pueden envolver una palabra y no forman parte de ella. La raya (—)
 * es la primera por un motivo: en español el diálogo se marca con ella, y sin
 * recortarla la primera palabra de cada línea de diálogo («—Otra») sería un error
 * ortográfico. Una novela son miles de líneas de diálogo (RFC-0004 §6).
 */
const EDGE = "—–-«»\"'“”‘’¿?¡!.,;:()[]{}…*_`~/\\|&%$#@+=<>";

/** Recorta signos de los bordes conservando lo interior (`M'hijo`, `veinti-algo`). */
function trimWord(raw: string): string {
  let start = 0;
  let end = raw.length;
  while (start < end && EDGE.includes(raw[start]!)) start++;
  while (end > start && EDGE.includes(raw[end - 1]!)) end--;
  return raw.slice(start, end);
}

/** Lo que no es prosa no se corrige: enlaces, código y palabras con dígitos. */
function isCheckable(word: string): boolean {
  if (word.length < 2) return false;
  if (/\d/.test(word)) return false;
  if (/^(https?:|www\.|[\w.-]+@)/i.test(word)) return false;
  // Al menos una letra: descarta "..." o "***" que hayan sobrevivido al recorte.
  return /\p{L}/u.test(word);
}

export interface Misspelling {
  word: string;
  /** Offsets en el texto analizado, mismo sistema que `analyzeInline`. */
  from: number;
  to: number;
}

/**
 * Encuentra las palabras desconocidas de un texto, con sus posiciones. Separado
 * de las sugerencias porque sugerir es caro y solo hace falta para lo que se va a
 * mostrar.
 */
export function findMisspellings(text: string, speller: Speller): Misspelling[] {
  const found: Misspelling[] = [];
  // Trozos separados por espacio: se recortan los signos de los bordes y se
  // conserva la posición original, que es lo que el subrayado necesita.
  const chunks = text.matchAll(/\S+/gu);
  // Dentro de un bloque de código en línea no se corrige nada.
  const code = codeRanges(text);
  for (const chunk of chunks) {
    const raw = chunk[0];
    const offset = chunk.index;
    if (code.some(([from, to]) => offset >= from && offset < to)) continue;
    const word = trimWord(raw);
    if (!isCheckable(word) || speller.correct(word)) continue;
    const start = offset + raw.indexOf(word);
    found.push({ word, from: start, to: start + word.length });
  }
  return found;
}

/** Tramos entre acentos graves: código, no prosa. */
function codeRanges(text: string): [number, number][] {
  const ranges: [number, number][] = [];
  for (const match of text.matchAll(/`[^`\n]*`/g)) {
    ranges.push([match.index, match.index + match[0].length]);
  }
  return ranges;
}

/**
 * Las faltas como subrayados, con la sugerencia en el mensaje: el editor ya
 * muestra `message` y `why` al pasar el cursor, así que no hace falta ninguna API
 * nueva para que el escritor vea la corrección.
 */
export function analyzeSpelling(text: string, speller: Speller): InlineFinding[] {
  return findMisspellings(text, speller).map(({ word, from, to }) => {
    const suggestions = speller.suggest(word).slice(0, 3);
    return {
      category: "ortografia" as const,
      from,
      to,
      message: `«${word}» no está en el diccionario`,
      why:
        suggestions.length > 0
          ? `¿Quisiste decir ${suggestions.join(", ")}? Si la palabra es correcta —el nombre de un personaje, por ejemplo— añádela al diccionario del proyecto.`
          : "Si la palabra es correcta —el nombre de un personaje, por ejemplo— añádela al diccionario del proyecto y no se volverá a marcar.",
    };
  });
}

export interface UnknownWord {
  word: string;
  /** Cuántas veces aparece en el documento. */
  count: number;
  suggestions: string[];
}

/**
 * Palabras desconocidas agrupadas y contadas, para el panel de Ortografía: un
 * novelista añade los diez nombres de sus personajes de una vez, en lugar de una
 * por aparición.
 */
export function listUnknownWords(text: string, speller: Speller): UnknownWord[] {
  const counts = new Map<string, number>();
  for (const { word } of findMisspellings(text, speller)) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts]
    .map(([word, count]) => ({ word, count, suggestions: speller.suggest(word).slice(0, 3) }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}
