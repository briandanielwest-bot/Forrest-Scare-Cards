import { Router } from "express";
import { z } from "zod";
import { id, one, query } from "../lib/db";
import { requireUser } from "../lib/auth";
import { ownedBook } from "./guards";
import { countWords, writeChapter, writeIllustrated } from "../agents/orchestrator";

export const writeRouter = Router({ mergeParams: true });

/** Write or rewrite one chapter, with the full review pass. */
writeRouter.post("/chapters/:chapterId/write", requireUser, ownedBook, async (req, res, next) => {
  try {
    const quick = req.body?.quick === true;
    const result = await writeChapter({
      bookId: req.params.bookId,
      chapterId: req.params.chapterId,
      userId: req.user!.id,
      quick,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** Illustrated books are written whole — page turns only work that way. */
writeRouter.post("/write-spreads", requireUser, ownedBook, async (req, res, next) => {
  try {
    res.json(await writeIllustrated({ bookId: req.params.bookId, userId: req.user!.id }));
  } catch (err) {
    next(err);
  }
});

/**
 * The author's own edit.
 *
 * Saved as a new draft version authored by the author, never as an overwrite.
 * In co-writer mode this is what the Ghostwriter is told to preserve on the
 * next pass, so it has to survive as its own record.
 */
writeRouter.put("/chapters/:chapterId/draft", requireUser, ownedBook, async (req, res) => {
  const parsed = z.object({ body: z.string() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nothing to save." });
    return;
  }

  const chapter = await one<{ id: string }>(
    `SELECT id FROM chapters WHERE id = $1 AND book_id = $2`,
    [req.params.chapterId, req.params.bookId],
  );
  if (!chapter) {
    res.status(404).json({ error: "That chapter doesn't exist." });
    return;
  }

  const version =
    (
      await one<{ v: number }>(
        `SELECT COALESCE(MAX(version), 0) + 1 AS v FROM drafts WHERE chapter_id = $1`,
        [req.params.chapterId],
      )
    )?.v ?? 1;

  const draftId = id("drf");
  await query(
    `INSERT INTO drafts (id, book_id, chapter_id, version, body, word_count, authored_by)
     VALUES ($1,$2,$3,$4,$5,$6,'author')`,
    [draftId, req.params.bookId, req.params.chapterId, version, parsed.data.body, countWords(parsed.data.body)],
  );
  await query(
    `UPDATE chapters SET current_draft_id = $2, status = 'edited', updated_at = now() WHERE id = $1`,
    [req.params.chapterId, draftId],
  );
  await query(`UPDATE books SET updated_at = now() WHERE id = $1`, [req.params.bookId]);

  res.json({ draftId, version, wordCount: countWords(parsed.data.body) });
});

/** Every version ever written, so nothing is ever really lost. */
writeRouter.get("/chapters/:chapterId/history", requireUser, ownedBook, async (req, res) => {
  const drafts = await query(
    `SELECT id, version, word_count, authored_by, created_at
       FROM drafts WHERE chapter_id = $1 AND book_id = $2 ORDER BY version DESC`,
    [req.params.chapterId, req.params.bookId],
  );
  res.json({ drafts });
});

writeRouter.post("/chapters/:chapterId/revert/:draftId", requireUser, ownedBook, async (req, res) => {
  const draft = await one<{ id: string }>(
    `SELECT id FROM drafts WHERE id = $1 AND chapter_id = $2 AND book_id = $3`,
    [req.params.draftId, req.params.chapterId, req.params.bookId],
  );
  if (!draft) {
    res.status(404).json({ error: "That version doesn't exist." });
    return;
  }
  // Reverting is a pointer move. The version being left behind stays in the
  // table, so a revert can itself be reverted.
  await query(`UPDATE chapters SET current_draft_id = $2, updated_at = now() WHERE id = $1`, [
    req.params.chapterId,
    req.params.draftId,
  ]);
  res.json({ ok: true });
});

writeRouter.post("/reviews/:reviewId/resolve", requireUser, ownedBook, async (req, res) => {
  await query(`UPDATE reviews SET resolved = true WHERE id = $1 AND book_id = $2`, [
    req.params.reviewId,
    req.params.bookId,
  ]);
  res.json({ ok: true });
});

writeRouter.put("/spreads/:spreadId", requireUser, ownedBook, async (req, res) => {
  const parsed = z.object({ text: z.string().max(4000) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nothing to save." });
    return;
  }
  await query(
    `UPDATE spreads SET text = $3, updated_at = now() WHERE id = $1 AND book_id = $2`,
    [req.params.spreadId, req.params.bookId, parsed.data.text],
  );
  res.json({ ok: true });
});
