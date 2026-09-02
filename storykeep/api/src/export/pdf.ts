import PDFDocument from "pdfkit";
import { BRAND } from "../brand";
import { compile, paragraphs, type CompiledBook } from "./model";

/**
 * A print-ready interior PDF.
 *
 * The numbers here are not decoration. A book block needs a larger inside
 * margin than outside, because the binding eats some of it; page numbers sit
 * outside; and the first page of a chapter carries no folio. Getting these
 * wrong is the difference between a file a printer accepts and one they
 * bounce.
 */
const PT = 72; // points per inch
const GUTTER_IN = 0.75; // inside margin — the binding takes part of this
const OUTER_IN = 0.5;
const VERT_IN = 0.75;

export async function renderPdf(bookId: string): Promise<Buffer> {
  const compiled = await compile(bookId);
  return compiled.genre.illustrated ? illustratedPdf(compiled) : prosePdf(compiled);
}

function newDoc(compiled: CompiledBook): PDFKit.PDFDocument {
  return new PDFDocument({
    size: [compiled.trim.widthIn * PT, compiled.trim.heightIn * PT],
    margins: {
      top: VERT_IN * PT,
      bottom: VERT_IN * PT,
      left: GUTTER_IN * PT,
      right: OUTER_IN * PT,
    },
    autoFirstPage: false,
    // Required for the page-number pass below: pdfkit can only revisit a page
    // it has kept in memory, and it only keeps them when told to.
    bufferPages: true,
    info: {
      Title: compiled.frontMatter.title,
      Author: compiled.frontMatter.byline || compiled.authorName,
      Creator: BRAND.name,
    },
  });
}

function collect(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function frontMatterPages(doc: PDFKit.PDFDocument, c: CompiledBook): void {
  const width = c.trim.widthIn * PT;

  doc.addPage();
  doc.moveDown(6);
  doc.font("Times-Bold").fontSize(26).text(c.frontMatter.title, { align: "center" });
  if (c.frontMatter.subtitle) {
    doc.moveDown(0.6);
    doc.font("Times-Italic").fontSize(14).text(c.frontMatter.subtitle, { align: "center" });
  }
  if (c.frontMatter.byline) {
    doc.moveDown(3);
    doc.font("Times-Roman").fontSize(13).text(c.frontMatter.byline, { align: "center" });
  }

  if (c.frontMatter.dedication) {
    doc.addPage();
    doc.moveDown(8);
    doc.font("Times-Italic").fontSize(12).text(c.frontMatter.dedication, {
      align: "center",
      width: width - (GUTTER_IN + OUTER_IN) * PT,
    });
  }

  if (c.frontMatter.epigraph) {
    doc.addPage();
    doc.moveDown(8);
    doc.font("Times-Italic").fontSize(12).text(`"${c.frontMatter.epigraph}"`, { align: "center" });
    doc.moveDown(1);
    doc.font("Times-Roman").fontSize(10).text(`— ${c.authorName}`, { align: "center" });
  }

  if (c.frontMatter.authorNote) {
    doc.addPage();
    doc.font("Times-Bold").fontSize(13).text("A note from the author");
    doc.moveDown(1);
    doc.font("Times-Roman").fontSize(11.5).text(c.frontMatter.authorNote, {
      align: "left",
      lineGap: 3,
    });
  }
}

async function prosePdf(c: CompiledBook): Promise<Buffer> {
  const doc = newDoc(c);
  frontMatterPages(doc, c);

  const bodyStartPage = doc.bufferedPageRange().count;

  for (const section of c.sections) {
    doc.addPage();
    // Chapter openings drop a third of the way down the page. It is the single
    // clearest signal that this is a book and not a printed document.
    doc.moveDown(4);
    doc.font("Times-Bold").fontSize(17).text(section.title, { align: "left" });
    doc.moveDown(1.5);
    doc.font("Times-Roman").fontSize(11.5);

    const paras = paragraphs(section.body);
    paras.forEach((p, i) => {
      doc.text(p, {
        align: "justify",
        lineGap: 3.2,
        // No first-line indent on the paragraph that opens a chapter; every
        // paragraph after it is indented. This is standard book typography.
        indent: i === 0 ? 0 : 16,
        paragraphGap: 0,
      });
    });

  }

  if (c.frontMatter.backCover) {
    doc.addPage();
    doc.moveDown(6);
    doc.font("Times-Italic").fontSize(11).text(c.frontMatter.backCover, { align: "center" });
  }

  doc.addPage();
  doc.moveDown(10);
  doc.font("Times-Roman").fontSize(9).text(BRAND.colophon, { align: "center" });

  stampPageNumbers(doc, c, bodyStartPage);
  return collect(doc);
}

/**
 * Page numbers, stamped in a second pass.
 *
 * They cannot be written during layout because a chapter's length is only
 * known once it has flowed. Front matter is deliberately unnumbered, and
 * numbering restarts at 1 on the first page of the body — which is what a
 * book does and what a printer expects.
 */
function stampPageNumbers(doc: PDFKit.PDFDocument, c: CompiledBook, fromPage: number): void {
  const range = doc.bufferedPageRange();
  const width = c.trim.widthIn * PT;
  const height = c.trim.heightIn * PT;

  for (let i = fromPage; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const folio = i - fromPage + 1;
    const onRight = folio % 2 === 1;
    doc
      .font("Times-Roman")
      .fontSize(9)
      .fillColor("#444")
      .text(String(folio), onRight ? width / 2 : GUTTER_IN * PT, height - VERT_IN * PT + 18, {
        width: onRight ? width / 2 - OUTER_IN * PT : width / 2 - GUTTER_IN * PT,
        align: onRight ? "right" : "left",
        lineBreak: false,
      });
  }
}

async function illustratedPdf(c: CompiledBook): Promise<Buffer> {
  const doc = newDoc(c);
  const width = c.trim.widthIn * PT;
  const height = c.trim.heightIn * PT;

  doc.addPage();
  doc.moveDown(5);
  doc.font("Helvetica-Bold").fontSize(28).text(c.frontMatter.title, { align: "center" });
  if (c.frontMatter.byline) {
    doc.moveDown(2);
    doc.font("Helvetica").fontSize(13).text(c.frontMatter.byline, { align: "center" });
  }
  if (c.frontMatter.dedication) {
    doc.addPage();
    doc.moveDown(8);
    doc.font("Helvetica-Oblique").fontSize(12).text(c.frontMatter.dedication, { align: "center" });
  }

  for (const spread of c.spreads) {
    doc.addPage();
    if (spread.imageUrl) {
      try {
        const bytes = Buffer.from(
          await (await fetch(spread.imageUrl)).arrayBuffer(),
        );
        // Art bleeds to the top two-thirds; the text sits in the clear band
        // below it, which is the area Ink was told to compose for.
        doc.image(bytes, 0, 0, { width, height: height * 0.68 });
      } catch {
        // A dead image URL must not cost the customer the whole book. The
        // spread prints with its words and a blank plate.
      }
    }
    if (spread.text.trim()) {
      doc
        .font("Helvetica")
        .fontSize(15)
        .fillColor("#1a1a1a")
        .text(spread.text.trim(), GUTTER_IN * PT, height * 0.74, {
          width: width - (GUTTER_IN + OUTER_IN) * PT,
          align: "center",
          lineGap: 5,
        });
    }
  }

  doc.addPage();
  doc.moveDown(10);
  doc.font("Helvetica").fontSize(9).text(BRAND.colophon, { align: "center" });

  return collect(doc);
}
