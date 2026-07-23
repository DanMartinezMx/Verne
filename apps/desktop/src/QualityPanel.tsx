import type { Finding, FindingCategory, QualityReport } from "@verne/core";

interface QualityPanelProps {
  title: string;
  report: QualityReport;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<FindingCategory, string> = {
  "frase-larga": "Frases largas",
  repeticion: "Repeticiones cercanas",
  "adverbio-mente": "Adverbios en -mente",
  muletilla: "Muletillas",
};

const CATEGORY_ORDER: FindingCategory[] = [
  "repeticion",
  "frase-larga",
  "adverbio-mente",
  "muletilla",
];

/**
 * Calidad sin IA (P16): señala y explica. Nunca puntúa a la persona, nunca
 * "corrige todo": cada hallazgo es una invitación a decidir, con su porqué.
 */
export function QualityPanel({ title, report, onClose }: QualityPanelProps) {
  const grouped = new Map<FindingCategory, Finding[]>();
  for (const finding of report.findings) {
    grouped.set(finding.category, [...(grouped.get(finding.category) ?? []), finding]);
  }

  return (
    <section className="quality">
      <header className="export-header">
        <h2>Calidad de “{title}”</h2>
        <button type="button" onClick={onClose}>
          ← Volver al documento
        </button>
      </header>

      <div className="quality-stats">
        <div className="quality-stat">
          <span className="quality-stat-value">{report.words}</span>
          <span className="quality-stat-label">palabras</span>
        </div>
        <div className="quality-stat">
          <span className="quality-stat-value">{report.sentences}</span>
          <span className="quality-stat-label">frases</span>
        </div>
        <div className="quality-stat">
          <span className="quality-stat-value">{report.avgWordsPerSentence}</span>
          <span className="quality-stat-label">palabras/frase</span>
        </div>
        <div className="quality-stat">
          <span className="quality-stat-value">{report.readabilityLabel}</span>
          <span className="quality-stat-label">
            {report.readability !== null
              ? `legibilidad ${report.readability} (Fernández-Huerta)`
              : "se necesita más texto para medir legibilidad"}
          </span>
        </div>
      </div>

      {report.findings.length === 0 ? (
        <p className="placeholder">
          Nada que señalar con las reglas actuales. Eso no significa que el texto esté
          terminado — significa que las decisiones que quedan son tuyas.
        </p>
      ) : (
        CATEGORY_ORDER.map((category) => {
          const findings = grouped.get(category);
          if (!findings || findings.length === 0) return null;
          return (
            <div key={category} className="quality-group">
              <h3>
                {CATEGORY_LABELS[category]} ({findings.length})
              </h3>
              <p className="quality-why">{findings[0]?.why}</p>
              <ul className="quality-findings">
                {findings.map((finding, i) => (
                  <li key={i}>
                    <span className="quality-message">{finding.message}</span>
                    {finding.excerpt && (
                      <blockquote className="quality-excerpt">{finding.excerpt}</blockquote>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}

      <p className="quality-footnote">
        Estas señales son reglas deterministas, locales y sin IA: miden mecánica, no
        talento. La ortografía la subraya el corrector del sistema mientras escribes.
      </p>
    </section>
  );
}
