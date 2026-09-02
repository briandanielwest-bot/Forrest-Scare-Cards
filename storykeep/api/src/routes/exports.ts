import { Router } from "express";
import { z } from "zod";
import { id, one, query } from "../lib/db";
import { requireUser } from "../lib/auth";
import { ownedBook } from "./guards";
import { renderPdf } from "../export/pdf";
import { renderEpub } from "../export/epub";
import { renderDocx } from "../export/docx";
import { buildFrontMatter } from "../agents/typesetter";
import { loadContext, transcriptOf } from "../agents/orchestrator";
import { assertWithinBudget } from "../lib/spend";
import { PAYMENTS_ENABLED } from "../config";
import { PRICES, hasPaidFor } from "./pricing";

export const exportRouter = Router({ mergeParams: true });

/**
 * Front and back matter. Runs once, then is stored on the book, because a
 * dedication that changes every time you export is unsettling to a customer
 * who is about to spend money on printing it.
 */
exportRouter.post("/front-matter", requireUser, ownedBook, async (req, res, next) => {
  try {
    await assertWithinBudget(req.user!.id);
    const bookId = req.params.bookId;
    const ctx = await loadContext(bookId);
    const author = await one<{ display_name: string | null; email: string }>(
      `SELECT display_name, email FROM users WHERE id = $1`,
      [req.user!.id],
    );

    const digest = await transcriptOf(bookId, 120);
    const frontMatter = await buildFrontMatter({
      bookId,
      userId: req.user!.id,
      bible: ctx.bible,
      authorName: author?.display_name ?? "",
      digest,
    });

    await query(
      `UPDATE books
          SET blueprint = blueprint || jsonb_build_object('frontMatter', $2::jsonb),
              updated_at = now()
        WHERE id = $1`,
      [
        bookId,
        JSON.stringify({
          title: frontMatter.titlePage.title,
          subtitle: frontMatter.titlePage.subtitle,
          byline: frontMatter.titlePage.byline,
          dedication: frontMatter.dedication,
          epigraph: frontMatter.epigraph,
          authorNote: frontMatter.authorNote,
          backCover: frontMatter.backCover,
        }),
      ],
    );
    res.json({ frontMatter });
  } catch (err) {
    next(err);
  }
});

const FORMATS = { pdf: renderPdf, epub: renderEpub, docx: renderDocx } as const;
const MIME = {
  pdf: "application/pdf",
  epub: "application/epub+zip",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

/**
 * A watermarked preview of the first pages, free and unauthenticated by
 * payment.
 *
 * This exists because the product's whole conversion story is "they are
 * already attached to the book before they pay". Showing someone their own
 * chapter typeset on a real page does more selling than any landing page.
 */
exportRouter.get("/preview.pdf", requireUser, ownedBook, async (req, res, next) => {
  try {
    const buffer = await renderPdf(req.params.bookId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="preview.pdf"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

exportRouter.get("/:format", requireUser, ownedBook, async (req, res, next) => {
  try {
    const parsed = z.enum(["pdf", "epub", "docx"]).safeParse(req.params.format);
    if (!parsed.success) {
      res.status(404).json({ error: "Unknown format." });
      return;
    }
    const format = parsed.data;

    if (PAYMENTS_ENABLED && !(await hasPaidFor(req.params.bookId, "export"))) {
      res.status(402).json({
        error: "Unlock this book to download it.",
        price: PRICES.export,
        checkoutPath: `/api/books/${req.params.bookId}/orders/checkout`,
      });
      return;
    }

    const buffer = await FORMATS[format](req.params.bookId);
    const book = await one<{ title: string }>(`SELECT title FROM books WHERE id = $1`, [
      req.params.bookId,
    ]);
    const filename = `${(book?.title ?? "book").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${format}`;

    await query(
      `INSERT INTO exports (id, book_id, format, bytes, paid) VALUES ($1,$2,$3,$4,$5)`,
      [id("exp"), req.params.bookId, format, buffer.length, PAYMENTS_ENABLED],
    );

    res.setHeader("Content-Type", MIME[format]);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});
