/**
 * Análisis de calidad del texto SIN IA (RFC-0001 §11, capas 2–3; P16):
 * reglas deterministas que además de señalar, explican. Todo en español,
 * todo local, todo instantáneo.
 */

export type FindingCategory =
  | "frase-larga"
  | "repeticion"
  | "adverbio-mente"
  | "muletilla"
  /**
   * Capa 1 (RFC-0004). Solo aparece en los subrayados en vivo, no en el informe
   * de calidad: una falta de ortografía no es un problema de estilo que haya que
   * explicar, es una palabra que corregir.
   */
  | "ortografia";

export interface Finding {
  category: FindingCategory;
  /** Qué se encontró, concreto. */
  message: string;
  /** Fragmento del texto donde ocurre. */
  excerpt: string;
  /** La explicación educativa: por qué esto puede debilitar el texto. */
  why: string;
}

export interface QualityReport {
  words: number;
  sentences: number;
  avgWordsPerSentence: number;
  /** Índice Fernández-Huerta (0–120 aprox.; más alto = más legible). Null si hay poco texto. */
  readability: number | null;
  readabilityLabel: string;
  findings: Finding[];
}

/**
 * Un hallazgo situado: la misma señal que `Finding`, pero con el tramo exacto
 * `[from, to)` (offsets de carácter en el texto analizado) donde ocurre. Es lo
 * que el editor necesita para subrayar en vivo, sin conocer las reglas.
 */
export interface InlineFinding {
  category: FindingCategory;
  /** Offset inicial (inclusive) en el texto analizado. */
  from: number;
  /** Offset final (exclusivo) en el texto analizado. */
  to: number;
  /** Qué se encontró, concreto. */
  message: string;
  /** La explicación educativa (la misma que en el panel). */
  why: string;
}

/**
 * La explicación educativa de cada hallazgo de estilo (P16). La ortografía queda
 * fuera a propósito: su explicación no es un texto fijo sobre por qué algo
 * debilita la prosa, es la sugerencia concreta para esa palabra.
 */
const WHY: Record<Exclude<FindingCategory, "ortografia">, string> = {
  "frase-larga":
    "Las frases muy largas obligan al lector a retener demasiado antes de llegar al verbo o a la idea. No están prohibidas — pero cada una debería ser una decisión, no un accidente. Prueba a leerla en voz alta: donde te falte el aire, suele faltar un punto.",
  repeticion:
    "Repetir una palabra poco común a corta distancia hace que el lector la note dos veces — y la segunda vez lo saca del texto. Puedes sustituir, reformular… o dejarla, si la repetición es deliberada (la anáfora es un recurso, el eco involuntario no).",
  "adverbio-mente":
    "Los adverbios en -mente son cómodos pero pesados: alargan la frase y suelen esconder un verbo más preciso (\"caminaba lentamente\" → \"se arrastraba\"). Dos en la misma frase casi siempre son uno de más.",
  muletilla:
    "Las muletillas rellenan sin decir: el texto significa lo mismo sin ellas, pero más rápido. Bórralas en la revisión y compara — si no se pierde nada, sobraban.",
};

const STOPWORDS = new Set(
  "el la los las un una unos unas de del a al y o u e que se su sus le les lo en con por para como más pero sino este esta estos estas ese esa esos esas aquel aquella cuando donde mientras aunque porque entre desde hasta sobre había era fue son está están hay muy también todo toda todos todas otro otra otros otras poco mucho nada algo quien cual ya no sí".split(
    /\s+/,
  ),
);

const MULETILLAS = [
  "en realidad",
  "la verdad es que",
  "cabe mencionar",
  "cabe destacar",
  "es importante mencionar",
  "de alguna manera",
  "de alguna forma",
  "básicamente",
  "obviamente",
  "literalmente",
  "en cierto modo",
  "por así decirlo",
  "valga la redundancia",
  "a nivel de",
];

const LONG_SENTENCE_WORDS = 40;
const REPETITION_WINDOW = 30;
const MAX_FINDINGS_PER_CATEGORY = 8;

export function analyzeText(text: string): QualityReport {
  const clean = stripMarkdown(text);
  const sentences = splitSentences(clean);
  const allWords = tokenize(clean);
  const words = allWords.length;
  const syllables = allWords.reduce((sum, w) => sum + countSyllables(w), 0);

  const report: QualityReport = {
    words,
    sentences: sentences.length,
    avgWordsPerSentence: sentences.length > 0 ? Math.round((words / sentences.length) * 10) / 10 : 0,
    readability: null,
    readabilityLabel: "—",
    findings: [],
  };

  if (words >= 30 && sentences.length > 0) {
    // Índice Fernández-Huerta (adaptación española de Flesch)
    const score =
      206.84 - 0.6 * ((syllables / words) * 100) - 1.02 * (words / sentences.length);
    report.readability = Math.round(score * 10) / 10;
    report.readabilityLabel = readabilityLabel(score);
  }

  findLongSentences(sentences, report.findings);
  findRepetitions(clean, report.findings);
  findMenteAdverbs(sentences, report.findings);
  findMuletillas(clean, report.findings);
  return report;
}

function readabilityLabel(score: number): string {
  if (score >= 90) return "Muy fácil de leer";
  if (score >= 80) return "Fácil";
  if (score >= 70) return "Algo fácil";
  if (score >= 60) return "Normal";
  if (score >= 50) return "Algo difícil";
  if (score >= 30) return "Difícil";
  return "Muy difícil";
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ") // bloques de código fuera del análisis
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_>#]/g, "")
    .replace(/^-{3,}\s*$/gm, " ");
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => tokenize(s).length > 0);
}

function tokenize(text: string): string[] {
  return text.match(/[\p{L}\p{N}]+(?:[''’-][\p{L}\p{N}]+)*/gu) ?? [];
}

/** Sílabas aproximadas: grupos vocálicos, uniendo diptongos. */
export function countSyllables(word: string): number {
  const w = word.toLowerCase();
  const vowelGroups = w.match(/[aeiouáéíóúüy]+/g);
  if (!vowelGroups) return 1;
  let count = 0;
  for (const group of vowelGroups) {
    count += Math.max(1, Math.ceil(group.replace(/[iuü](?=[aeoáéó])|(?<=[aeoáéó])[iu]/g, "").length));
  }
  return Math.max(1, count);
}

function findLongSentences(sentences: string[], findings: Finding[]): void {
  let added = 0;
  for (const sentence of sentences) {
    if (added >= MAX_FINDINGS_PER_CATEGORY) break;
    const count = tokenize(sentence).length;
    if (count > LONG_SENTENCE_WORDS) {
      findings.push({
        category: "frase-larga",
        message: `Frase de ${count} palabras`,
        excerpt: excerptOf(sentence),
        why: WHY["frase-larga"],
      });
      added++;
    }
  }
}

function findRepetitions(text: string, findings: Finding[]): void {
  const tokens = tokenize(text);
  const lastSeen = new Map<string, number>();
  const reported = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i] ?? "";
    const word = raw.toLowerCase();
    if (word.length < 4 || STOPWORDS.has(word) || /^\d+$/.test(word)) continue;
    const prev = lastSeen.get(word);
    if (
      prev !== undefined &&
      i - prev <= REPETITION_WINDOW &&
      !reported.has(word) &&
      findings.filter((f) => f.category === "repeticion").length < MAX_FINDINGS_PER_CATEGORY
    ) {
      reported.add(word);
      findings.push({
        category: "repeticion",
        message: `"${word}" aparece dos veces en ${i - prev} palabras`,
        excerpt: excerptAround(text, raw),
        why: WHY.repeticion,
      });
    }
    lastSeen.set(word, i);
  }
}

function findMenteAdverbs(sentences: string[], findings: Finding[]): void {
  let added = 0;
  for (const sentence of sentences) {
    if (added >= MAX_FINDINGS_PER_CATEGORY) break;
    const mente = tokenize(sentence).filter((w) => /mente$/i.test(w) && w.length > 7);
    if (mente.length >= 2) {
      findings.push({
        category: "adverbio-mente",
        message: `${mente.length} adverbios en -mente en la misma frase: ${mente.join(", ")}`,
        excerpt: excerptOf(sentence),
        why: WHY["adverbio-mente"],
      });
      added++;
    }
  }
}

function findMuletillas(text: string, findings: Finding[]): void {
  const folded = fold(text);
  for (const muletilla of MULETILLAS) {
    if (findings.filter((f) => f.category === "muletilla").length >= MAX_FINDINGS_PER_CATEGORY) {
      break;
    }
    const count = folded.split(fold(muletilla)).length - 1;
    if (count >= 2) {
      findings.push({
        category: "muletilla",
        message: `"${muletilla}" aparece ${count} veces`,
        excerpt: excerptAround(text, muletilla),
        why: WHY.muletilla,
      });
    }
  }
}

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function excerptOf(sentence: string, max = 120): string {
  return sentence.length > max ? `${sentence.slice(0, max)}…` : sentence;
}

function excerptAround(text: string, needle: string, radius = 50): string {
  const index = fold(text).indexOf(fold(needle));
  if (index < 0) return "";
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + needle.length + radius);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).replace(/\n+/g, " ").trim()}${
    end < text.length ? "…" : ""
  }`;
}

// ── Análisis situado (para subrayar en vivo) ─────────────────────────────────

/** Tope de subrayados por categoría: en vivo interesa ver todos, sin ahogar. */
const MAX_INLINE_PER_CATEGORY = 40;

const WORD_RE = /[\p{L}\p{N}]+(?:[''’-][\p{L}\p{N}]+)*/gu;

interface PositionedToken {
  raw: string;
  lower: string;
  start: number;
  end: number;
}

/**
 * Analiza el texto y devuelve los tramos concretos a señalar, con el mismo
 * criterio que `analyzeText` pero conservando posiciones. El editor lo usa
 * para decorar; no depende de ProseMirror ni de la UI.
 */
export function analyzeInline(text: string): InlineFinding[] {
  const findings: InlineFinding[] = [];
  const spans = sentenceSpans(text);
  const tokens = positionedTokens(text);
  inlineLongSentences(spans, findings);
  inlineRepetitions(tokens, findings);
  inlineMenteAdverbs(spans, tokens, findings);
  inlineMuletillas(text, findings);
  return findings.sort((a, b) => a.from - b.from || a.to - b.to);
}

function positionedTokens(text: string): PositionedToken[] {
  const out: PositionedToken[] = [];
  WORD_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WORD_RE.exec(text)) !== null) {
    out.push({
      raw: match[0],
      lower: match[0].toLowerCase(),
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return out;
}

interface Span {
  start: number;
  end: number;
  text: string;
}

/** Divide en frases conservando el offset de inicio y fin de cada una. */
function sentenceSpans(text: string): Span[] {
  const parts = text.split(/((?<=[.!?…])\s+|\n+)/);
  const spans: Span[] = [];
  let pos = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i] ?? "";
    if (i % 2 === 0 && part.trim().length > 0) {
      const lead = part.length - part.trimStart().length;
      const trail = part.length - part.trimEnd().length;
      spans.push({ start: pos + lead, end: pos + part.length - trail, text: part.trim() });
    }
    pos += part.length;
  }
  return spans;
}

function inlineLongSentences(spans: Span[], findings: InlineFinding[]): void {
  let added = 0;
  for (const span of spans) {
    if (added >= MAX_INLINE_PER_CATEGORY) break;
    const count = (span.text.match(WORD_RE) ?? []).length;
    if (count > LONG_SENTENCE_WORDS) {
      findings.push({
        category: "frase-larga",
        from: span.start,
        to: span.end,
        message: `Frase de ${count} palabras`,
        why: WHY["frase-larga"],
      });
      added++;
    }
  }
}

function inlineRepetitions(tokens: PositionedToken[], findings: InlineFinding[]): void {
  const lastSeen = new Map<string, number>();
  let added = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t) continue;
    if (t.lower.length < 4 || STOPWORDS.has(t.lower) || /^\d+$/.test(t.lower)) continue;
    const prev = lastSeen.get(t.lower);
    if (prev !== undefined && i - prev <= REPETITION_WINDOW && added < MAX_INLINE_PER_CATEGORY) {
      findings.push({
        category: "repeticion",
        from: t.start,
        to: t.end,
        message: `"${t.lower}" aparece dos veces en ${i - prev} palabras`,
        why: WHY.repeticion,
      });
      added++;
    }
    lastSeen.set(t.lower, i);
  }
}

function inlineMenteAdverbs(
  spans: Span[],
  tokens: PositionedToken[],
  findings: InlineFinding[],
): void {
  let added = 0;
  for (const span of spans) {
    if (added >= MAX_INLINE_PER_CATEGORY) break;
    const mente = tokens.filter(
      (t) => t.start >= span.start && t.end <= span.end && /mente$/i.test(t.raw) && t.raw.length > 7,
    );
    if (mente.length >= 2) {
      for (const t of mente) {
        findings.push({
          category: "adverbio-mente",
          from: t.start,
          to: t.end,
          message: `${mente.length} adverbios en -mente en la misma frase: ${mente
            .map((m) => m.raw)
            .join(", ")}`,
          why: WHY["adverbio-mente"],
        });
      }
      added++;
    }
  }
}

function inlineMuletillas(text: string, findings: InlineFinding[]): void {
  let categoryTotal = 0;
  for (const muletilla of MULETILLAS) {
    if (categoryTotal >= MAX_INLINE_PER_CATEGORY) break;
    const re = accentInsensitivePattern(muletilla);
    const spots: Array<[number, number]> = [];
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      spots.push([match.index, match.index + match[0].length]);
      if (match.index === re.lastIndex) re.lastIndex++; // nunca atascarse
    }
    // Una muletilla suelta puede ser deliberada; dos o más ya es un patrón.
    if (spots.length >= 2) {
      for (const [from, to] of spots) {
        if (categoryTotal >= MAX_INLINE_PER_CATEGORY) break;
        findings.push({
          category: "muletilla",
          from,
          to,
          message: `"${muletilla}" aparece ${spots.length} veces`,
          why: WHY.muletilla,
        });
        categoryTotal++;
      }
    }
  }
}

/**
 * Construye una expresión regular que ignora acentos y mayúsculas SIN alterar
 * los offsets del texto original (a diferencia de `fold`, que normaliza y
 * desplaza posiciones). Las muletillas son frases conocidas: basta con abrir
 * cada vocal a sus variantes y tratar los espacios como espacios en blanco.
 */
function accentInsensitivePattern(phrase: string): RegExp {
  const vowels: Record<string, string> = {
    a: "[aá]",
    e: "[eé]",
    i: "[ií]",
    o: "[oó]",
    u: "[uúü]",
  };
  const source = phrase
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split("")
    .map((ch) => {
      if (vowels[ch]) return vowels[ch];
      if (/\s/.test(ch)) return "\\s+";
      return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
  return new RegExp(source, "giu");
}
