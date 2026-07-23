import { describe, expect, it } from "vitest";
import { analyzeInline, analyzeText, countSyllables } from "../src/analyze.js";

describe("countSyllables (aproximado)", () => {
  it("cuenta razonablemente palabras comunes", () => {
    expect(countSyllables("casa")).toBe(2);
    expect(countSyllables("sol")).toBe(1);
    expect(countSyllables("tierra")).toBe(2); // diptongo ie
    expect(countSyllables("literatura")).toBe(5);
    expect(countSyllables("lentamente")).toBe(4);
  });
});

describe("analyzeText", () => {
  it("texto corto: métricas sin legibilidad (muestra insuficiente)", () => {
    const report = analyzeText("Una frase corta. Otra más.");
    expect(report.sentences).toBe(2);
    expect(report.readability).toBeNull();
  });

  it("un texto sencillo puntúa más legible que uno enrevesado", () => {
    const facil = analyzeText(
      "El sol salió. La casa era blanca. El mar estaba cerca. Ana miró al cielo. " +
        "Luego bajó al pueblo. Compró pan. Volvió a casa. El día fue bueno. " +
        "Nadie dijo nada. Todo quedó en calma.",
    );
    const dificil = analyzeText(
      "La conceptualización epistemológica subyacente a la caracterización fenomenológica " +
        "del acontecimiento narrativo constituye, indudablemente, una problematización " +
        "hermenéutica cuya dilucidación requiere aproximaciones metodológicamente " +
        "heterogéneas y considerablemente sofisticadas para cualquier investigación rigurosa " +
        "que pretenda estructurar conclusiones representativamente generalizables.",
    );
    expect(facil.readability).not.toBeNull();
    expect(dificil.readability).not.toBeNull();
    expect(facil.readability ?? 0).toBeGreaterThan(dificil.readability ?? 0);
  });

  it("detecta frases largas con su porqué", () => {
    const larga = Array.from({ length: 45 }, (_, i) => `palabra${i}`).join(" ") + ".";
    const report = analyzeText(larga);
    const finding = report.findings.find((f) => f.category === "frase-larga");
    expect(finding?.message).toContain("45 palabras");
    expect(finding?.why.length).toBeGreaterThan(40);
  });

  it("detecta repeticiones cercanas ignorando palabras comunes", () => {
    const report = analyzeText(
      "El faro iluminaba la bahía. La luz del faro no dejaba dormir a nadie en el pueblo.",
    );
    const rep = report.findings.find((f) => f.category === "repeticion");
    expect(rep?.message).toContain('"faro"');
    // "la", "el", "del" se repiten pero son stopwords: no deben señalarse
    expect(report.findings.filter((f) => f.message.includes('"la"'))).toEqual([]);
  });

  it("no señala la misma palabra repetida a gran distancia", () => {
    const relleno = Array.from({ length: 60 }, (_, i) => `distinta${i}`).join(" ");
    const report = analyzeText(`El faro brillaba. ${relleno}. El faro seguía allí.`);
    expect(report.findings.find((f) => f.category === "repeticion")).toBeUndefined();
  });

  it("detecta dos adverbios -mente en la misma frase", () => {
    const report = analyzeText(
      "Caminaba lentamente y hablaba pausadamente con su hermana en el jardín.",
    );
    const finding = report.findings.find((f) => f.category === "adverbio-mente");
    expect(finding?.message).toContain("lentamente");
    expect(finding?.message).toContain("pausadamente");
  });

  it("detecta muletillas repetidas", () => {
    const report = analyzeText(
      "Básicamente el problema es el ritmo. La escena, básicamente, no avanza nunca.",
    );
    const finding = report.findings.find((f) => f.category === "muletilla");
    expect(finding?.message).toContain("básicamente");
  });

  it("ignora el código Markdown al analizar", () => {
    const report = analyzeText("Hola mundo.\n\n```\nfaro faro faro faro faro\n```\n");
    expect(report.findings.find((f) => f.category === "repeticion")).toBeUndefined();
  });
});

describe("analyzeInline (hallazgos situados)", () => {
  it("apunta la segunda aparición de una repetición con offsets exactos", () => {
    const text = "El faro iluminaba la bahía. La luz del faro no dejaba dormir.";
    const finding = analyzeInline(text).find((f) => f.category === "repeticion");
    expect(finding).toBeDefined();
    // el tramo señalado ES la palabra repetida, no otra cosa
    expect(text.slice(finding!.from, finding!.to)).toBe("faro");
    // y es la SEGUNDA aparición (la primera está antes del índice 20)
    expect(finding!.from).toBeGreaterThan(20);
  });

  it("subraya la frase larga completa", () => {
    const larga = Array.from({ length: 45 }, (_, i) => `palabra${i}`).join(" ") + ".";
    const finding = analyzeInline(larga).find((f) => f.category === "frase-larga");
    expect(finding).toBeDefined();
    expect(finding!.from).toBe(0);
    expect(text_at(larga, finding!)).toContain("palabra0");
    expect(text_at(larga, finding!)).toContain("palabra44");
  });

  it("señala cada adverbio -mente cuando hay dos en la frase", () => {
    const text = "Caminaba lentamente y hablaba pausadamente con ella.";
    const mente = analyzeInline(text).filter((f) => f.category === "adverbio-mente");
    expect(mente.map((f) => text.slice(f.from, f.to))).toEqual(["lentamente", "pausadamente"]);
  });

  it("localiza muletillas con acento sin desplazar los offsets", () => {
    const text = "Básicamente falla el ritmo. La escena, básicamente, no avanza.";
    const spots = analyzeInline(text).filter((f) => f.category === "muletilla");
    expect(spots.length).toBe(2);
    for (const spot of spots) {
      expect(text.slice(spot.from, spot.to).toLowerCase()).toBe("básicamente");
    }
  });

  it("una muletilla suelta no se subraya (puede ser deliberada)", () => {
    const spots = analyzeInline("Obviamente todo salió bien al final del día.").filter(
      (f) => f.category === "muletilla",
    );
    expect(spots).toEqual([]);
  });

  it("devuelve los hallazgos ordenados por posición", () => {
    const text = "Básicamente el faro. La luz del faro. La escena, básicamente, cae.";
    const froms = analyzeInline(text).map((f) => f.from);
    expect(froms).toEqual([...froms].sort((a, b) => a - b));
  });
});

function text_at(text: string, finding: { from: number; to: number }): string {
  return text.slice(finding.from, finding.to);
}
