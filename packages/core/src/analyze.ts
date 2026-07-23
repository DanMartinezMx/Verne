/**
 * Análisis de calidad del texto SIN IA (RFC-0001 §11, capas 2–3; P16):
 * reglas deterministas que además de señalar, explican. Todo en español,
 * todo local, todo instantáneo.
 */

export type FindingCategory =
  | "frase-larga"
  | "repeticion"
  | "adverbio-mente"
  | "muletilla";

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

const WHY: Record<FindingCategory, string> = {
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
