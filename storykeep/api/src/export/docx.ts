import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
} from "docx";
import { BRAND } from "../brand";
import { compile, paragraphs } from "./model";

/**
 * The handoff format.
 *
 * This is the file a customer sends to a human editor, or opens in Word to
 * keep working. So it is styled as a manuscript rather than as a finished
 * book: real heading styles, so the navigation pane works, and no attempt to
 * imitate the printed page.
 */
export async function renderDocx(bookId: string): Promise<Buffer> {
  const c = await compile(bookId);
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 240 },
      children: [new TextRun({ text: c.frontMatter.title, bold: true, size: 52 })],
    }),
  );
  if (c.frontMatter.subtitle) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: c.frontMatter.subtitle, italics: true, size: 28 })],
      }),
    );
  }
  if (c.frontMatter.byline) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 600 },
        children: [new TextRun({ text: c.frontMatter.byline, size: 24 })],
      }),
    );
  }
  if (c.frontMatter.dedication) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200 },
        children: [new TextRun({ text: c.frontMatter.dedication, italics: true })],
      }),
    );
  }
  children.push(new Paragraph({ children: [new PageBreak()] }));

  if (c.genre.illustrated) {
    c.spreads.forEach((spread, i) => {
      children.push(
        new Paragraph({ heading: HeadingLevel.HEADING_2, text: `Spread ${i + 1}` }),
      );
      if (spread.text.trim()) {
        children.push(new Paragraph({ text: spread.text.trim(), spacing: { after: 200 } }));
      }
      if (spread.imageUrl) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `[Illustration: ${spread.imageUrl}]`, italics: true, size: 18 })],
            spacing: { after: 400 },
          }),
        );
      }
    });
  } else {
    c.sections.forEach((section, index) => {
      if (index > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: section.title }));
      for (const p of paragraphs(section.body)) {
        children.push(
          new Paragraph({
            text: p,
            spacing: { after: 120, line: 360 },
            indent: { firstLine: 360 },
          }),
        );
      }
    });
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200 },
      children: [new TextRun({ text: BRAND.colophon, size: 18 })],
    }),
  );

  const doc = new Document({
    creator: c.frontMatter.byline || c.authorName || BRAND.name,
    title: c.frontMatter.title,
    styles: {
      default: {
        document: { run: { font: "Georgia", size: 24 } },
      },
    },
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}
