import { marked } from "marked";

export interface HtmlInput {
  title: string;
  body: string;
  language?: string;
}

/**
 * HTML limpio del cuerpo, sin envoltorio: pensado para pegar en cualquier
 * CMS o generador estático. Sin clases, sin estilos inline, sin sorpresas.
 */
export function toHtmlFragment(input: HtmlInput): string {
  return (marked.parse(input.body, { async: false }) as string).trim() + "\n";
}

/** Página HTML completa y autocontenida (para guardar o compartir tal cual). */
export function toHtmlDocument(input: HtmlInput): string {
  const fragment = toHtmlFragment(input);
  return `<!doctype html>
<html lang="${escapeAttr(input.language ?? "es")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.title)}</title>
<style>
  body { font-family: Georgia, serif; line-height: 1.7; max-width: 42rem;
         margin: 3rem auto; padding: 0 1rem; color: #222; }
  code, pre { font-family: ui-monospace, monospace; }
  pre { background: #f5f5f5; padding: 1rem; border-radius: 6px; overflow-x: auto; }
  blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 1rem; color: #555; }
</style>
</head>
<body>
<h1>${escapeHtml(input.title)}</h1>
${fragment}</body>
</html>
`;
}

/** Markdown limpio del cuerpo (sin frontmatter), listo para pegar. */
export function toCleanMarkdown(body: string): string {
  const trimmed = body.replace(/^\n+/, "").replace(/\n+$/, "");
  return trimmed === "" ? "" : `${trimmed}\n`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replaceAll('"', "&quot;");
}
