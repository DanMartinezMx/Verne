import { countWords } from "@verne/core";
import {
  AlignmentType,
  Document,
  Header,
  PageNumber,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { markdownToBlocks, type Block, type Run } from "./ir.js";

/**
 * DOCX en formato de manuscrito estándar (el que esperan revistas, concursos
 * y antologías): Times New Roman 12, doble espacio, márgenes de 1", sangría
 * de primera línea, título centrado, encabezado "Apellido / Título / página"
 * a partir de la página 2, separadores de escena "#", y "Fin" al cierre.
 */
export interface ManuscriptInput {
  title: string;
  body: string;
  author?: string;
  /** Líneas de contacto bajo el autor (email, ciudad…). */
  contact?: string[];
}

const TWIPS_INCH = 1440;
const INDENT = TWIPS_INCH / 2; // 0,5"
const DOUBLE = 480; // interlineado doble (240 = sencillo)

export async function toManuscriptDocx(input: ManuscriptInput): Promise<Uint8Array> {
  const words = countWords(input.body);
  const approx = words < 100 ? words : Math.round(words / 100) * 100;
  const surname = lastWord(input.author ?? "");
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Times New Roman", size: 24 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: TWIPS_INCH,
              right: TWIPS_INCH,
              bottom: TWIPS_INCH,
              left: TWIPS_INCH,
            },
          },
          titlePage: true,
        },
        headers: {
          // Encabezado desde la página 2; la primera va limpia (titlePage).
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun(
                    `${surname !== "" ? `${surname} / ` : ""}${shortTitle(input.title)} / `,
                  ),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                ],
              }),
            ],
          }),
          first: new Header({ children: [] }),
        },
        children: [
          ...frontMatter(input, approx),
          ...titleBlock(input),
          ...bodyParagraphs(markdownToBlocks(input.body)),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: DOUBLE, before: DOUBLE },
            children: [new TextRun("Fin")],
          }),
        ],
      },
    ],
  });
  return pack(doc);
}

function frontMatter(input: ManuscriptInput, approxWords: number): Paragraph[] {
  const lines: Paragraph[] = [];
  if (input.author) {
    lines.push(plain(input.author));
  }
  for (const line of input.contact ?? []) {
    if (line.trim() !== "") lines.push(plain(line.trim()));
  }
  lines.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun(`${approxWords.toLocaleString("es")} palabras aprox.`)],
    }),
  );
  return lines;
}

function titleBlock(input: ManuscriptInput): Paragraph[] {
  const block: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: TWIPS_INCH * 2, line: DOUBLE },
      children: [new TextRun(input.title)],
    }),
  ];
  if (input.author) {
    block.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: DOUBLE, after: DOUBLE },
        children: [new TextRun(`por ${input.author}`)],
      }),
    );
  }
  return block;
}

function bodyParagraphs(blocks: Block[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  for (const block of blocks) {
    switch (block.kind) {
      case "paragraph":
        paragraphs.push(
          new Paragraph({
            spacing: { line: DOUBLE },
            indent: { firstLine: INDENT },
            children: runsToText(block.runs),
          }),
        );
        break;
      case "heading":
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: DOUBLE, before: DOUBLE },
            children: runsToText(block.runs.map((r) => ({ ...r, bold: true }))),
          }),
        );
        break;
      case "scene-break":
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: DOUBLE },
            children: [new TextRun("#")],
          }),
        );
        break;
      case "quote":
        paragraphs.push(
          new Paragraph({
            spacing: { line: DOUBLE },
            indent: { left: INDENT },
            children: runsToText(block.runs),
          }),
        );
        break;
      case "code":
        for (const line of block.text.split("\n")) {
          paragraphs.push(
            new Paragraph({
              spacing: { line: DOUBLE },
              children: [new TextRun({ text: line, font: "Courier New" })],
            }),
          );
        }
        break;
      case "list-item":
        paragraphs.push(
          new Paragraph({
            spacing: { line: DOUBLE },
            indent: { left: INDENT },
            children: [
              new TextRun(block.ordered ? `${block.index}. ` : "– "),
              ...runsToText(block.runs),
            ],
          }),
        );
        break;
    }
  }
  return paragraphs;
}

function runsToText(runs: Run[]): TextRun[] {
  return runs.map(
    (run) =>
      new TextRun({
        text: run.text,
        bold: run.bold ?? false,
        italics: run.italic ?? false,
        ...(run.code ? { font: "Courier New" } : {}),
      }),
  );
}

function plain(text: string): Paragraph {
  return new Paragraph({ children: [new TextRun(text)] });
}

function lastWord(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 0 ? (parts[parts.length - 1] ?? "") : "";
}

function shortTitle(title: string): string {
  const words = title.trim().split(/\s+/).slice(0, 3).join(" ");
  return words.toUpperCase();
}

async function pack(doc: Document): Promise<Uint8Array> {
  // Packer.toBlob funciona tanto en el WebView como en Node ≥18 (Blob global).
  const blob = await Packer.toBlob(doc);
  return new Uint8Array(await blob.arrayBuffer());
}
