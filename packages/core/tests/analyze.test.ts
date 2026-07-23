import { describe, expect, it } from "vitest";
import { analyzeText, countSyllables } from "../src/analyze.js";

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
