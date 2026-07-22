import { Lexer, type Token, type Tokens } from "marked";

/**
 * Representación intermedia de exportación (el "AST común" de RFC-0001 §13,
 * versión M3): bloques y runs tipados, independientes del formato de salida.
 * Se testea a fondo aquí; los exportadores solo la recorren.
 */
export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

export type Block =
  | { kind: "paragraph"; runs: Run[] }
  | { kind: "heading"; level: number; runs: Run[] }
  | { kind: "scene-break" }
  | { kind: "quote"; runs: Run[] }
  | { kind: "code"; text: string }
  | { kind: "list-item"; ordered: boolean; index: number; runs: Run[] };

export function markdownToBlocks(markdown: string): Block[] {
  const tokens = new Lexer().lex(markdown);
  const blocks: Block[] = [];
  walk(tokens, blocks, false);
  return blocks;
}

function walk(tokens: Token[], out: Block[], insideQuote: boolean): void {
  for (const token of tokens) {
    switch (token.type) {
      case "paragraph": {
        const runs = inlineRuns((token as Tokens.Paragraph).tokens ?? []);
        out.push(insideQuote ? { kind: "quote", runs } : { kind: "paragraph", runs });
        break;
      }
      case "heading":
        out.push({
          kind: "heading",
          level: (token as Tokens.Heading).depth,
          runs: inlineRuns((token as Tokens.Heading).tokens ?? []),
        });
        break;
      case "hr":
        out.push({ kind: "scene-break" });
        break;
      case "blockquote":
        walk((token as Tokens.Blockquote).tokens ?? [], out, true);
        break;
      case "code":
        out.push({ kind: "code", text: (token as Tokens.Code).text });
        break;
      case "list": {
        const list = token as Tokens.List;
        list.items.forEach((item, i) => {
          const inner: Block[] = [];
          walk(item.tokens ?? [], inner, false);
          for (const block of inner) {
            if (block.kind === "paragraph") {
              out.push({
                kind: "list-item",
                ordered: Boolean(list.ordered),
                index: (typeof list.start === "number" ? list.start : 1) + i,
                runs: block.runs,
              });
            } else {
              out.push(block);
            }
          }
        });
        break;
      }
      case "text": {
        // items "tight" de lista llegan como text con tokens inline
        const t = token as Tokens.Text;
        if (t.tokens && t.tokens.length > 0) {
          out.push({ kind: "paragraph", runs: inlineRuns(t.tokens) });
        }
        break;
      }
      case "space":
        break;
      default:
        break;
    }
  }
}

function inlineRuns(tokens: Token[], style: { bold?: boolean; italic?: boolean } = {}): Run[] {
  const runs: Run[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "strong":
        runs.push(...inlineRuns((token as Tokens.Strong).tokens ?? [], { ...style, bold: true }));
        break;
      case "em":
        runs.push(...inlineRuns((token as Tokens.Em).tokens ?? [], { ...style, italic: true }));
        break;
      case "codespan":
        runs.push({ text: (token as Tokens.Codespan).text, code: true, ...style });
        break;
      case "link": {
        const link = token as Tokens.Link;
        runs.push(...inlineRuns(link.tokens ?? [], style));
        break;
      }
      case "br":
        runs.push({ text: "\n", ...style });
        break;
      case "escape":
        runs.push({ text: (token as Tokens.Escape).text, ...style });
        break;
      case "text": {
        const t = token as Tokens.Text;
        if (t.tokens && t.tokens.length > 0) runs.push(...inlineRuns(t.tokens, style));
        else runs.push({ text: decodeEntities(t.text), ...style });
        break;
      }
      default:
        if ("raw" in token) runs.push({ text: token.raw, ...style });
        break;
    }
  }
  return runs.filter((r) => r.text !== "");
}

function decodeEntities(text: string): string {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}
