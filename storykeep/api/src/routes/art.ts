import { Router } from "express";
import { z } from "zod";
import { one, query } from "../lib/db";
import { requireUser } from "../lib/auth";
import { ownedBook } from "./guards";
import { loadContext } from "../agents/orchestrator";
import { briefSpreads, buildArtBible } from "../agents/illustrator";
import { imagesEnabled, renderImage } from "../lib/images";
import { assertWithinBudget } from "../lib/spend";
import type { SpreadRow } from "../types";

export const artRouter = Router({ mergeParams: true });

/**
 * Build the style bible and the per-spread art direction.
 *
 * This runs whether or not an image provider is configured, because the briefs
 * are worth having on their own — they are what a customer hands to a human
 * illustrator, and they are what the animation upsell is quoted from.
 */
artRouter.post("/brief", requireUser, ownedBook, async (req, res, next) => {
  try {
    await assertWithinBudget(req.user!.id);
    const bookId = req.params.bookId;
    const styleWish = typeof req.body?.style === "string" ? req.body.style : "";

    const ctx = await loadContext(bookId);
    const spreads = await query<SpreadRow>(
      `SELECT * FROM spreads WHERE book_id = $1 ORDER BY position`,
      [bookId],
    );
    if (!spreads.length) {
      res.status(400).json({ error: "Write the book first — there's nothing to illustrate yet." });
      return;
    }

    const artBible = await buildArtBible({
      bookId,
      userId: req.user!.id,
      bible: ctx.bible,
      styleWish,
      storyText: spreads.map((s, i) => `Spread ${i + 1}: ${s.text}`).join("\n"),
    });

    await query(
      `INSERT INTO art_bible (book_id, style, palette, characters)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (book_id) DO UPDATE
         SET style = EXCLUDED.style, palette = EXCLUDED.palette,
             characters = EXCLUDED.characters, updated_at = now()`,
      [bookId, artBible.style, artBible.palette, JSON.stringify(artBible.characters)],
    );

    const art = await briefSpreads({
      bookId,
      userId: req.user!.id,
      bible: ctx.bible,
      artBible,
      spreadTexts: spreads.map((s) => s.text),
    });

    for (let i = 0; i < art.length && i < spreads.length; i++) {
      await query(
        `UPDATE spreads SET art_brief = $2, image_status = 'briefed', updated_at = now() WHERE id = $1`,
        [spreads[i].id, `${art[i].brief}\n\nRENDER PROMPT:\n${art[i].prompt}`],
      );
    }

    res.json({ artBible, spreads: art, canRender: imagesEnabled() });
  } catch (err) {
    next(err);
  }
});

/** Render one spread. One at a time, so a failure costs one image, not a book. */
artRouter.post("/spreads/:spreadId/render", requireUser, ownedBook, async (req, res, next) => {
  try {
    if (!imagesEnabled()) {
      res.status(503).json({
        error:
          "Illustration rendering isn't switched on for this deployment. The art brief for this spread is ready to hand to an illustrator.",
      });
      return;
    }

    const spread = await one<SpreadRow>(`SELECT * FROM spreads WHERE id = $1 AND book_id = $2`, [
      req.params.spreadId,
      req.params.bookId,
    ]);
    if (!spread?.art_brief) {
      res.status(400).json({ error: "This spread hasn't been art-directed yet." });
      return;
    }

    const prompt = spread.art_brief.split("RENDER PROMPT:")[1]?.trim() ?? spread.art_brief;
    const ctx = await loadContext(req.params.bookId);
    const aspect = ctx.trimAspect;

    await query(`UPDATE spreads SET image_status = 'rendering' WHERE id = $1`, [spread.id]);
    try {
      const image = await renderImage(prompt, aspect);
      await query(
        `UPDATE spreads SET image_url = $2, image_status = 'ready', updated_at = now() WHERE id = $1`,
        [spread.id, image.url],
      );
      res.json({ imageUrl: image.url });
    } catch (err) {
      await query(`UPDATE spreads SET image_status = 'failed' WHERE id = $1`, [spread.id]);
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

artRouter.get("/", requireUser, ownedBook, async (req, res) => {
  const [bible, spreads] = await Promise.all([
    one(`SELECT * FROM art_bible WHERE book_id = $1`, [req.params.bookId]),
    query(`SELECT * FROM spreads WHERE book_id = $1 ORDER BY position`, [req.params.bookId]),
  ]);
  res.json({ artBible: bible, spreads, canRender: imagesEnabled() });
});
