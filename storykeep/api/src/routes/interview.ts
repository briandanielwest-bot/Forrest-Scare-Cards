import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { id, one, query } from "../lib/db";
import { requireUser } from "../lib/auth";
import { ownedBook } from "./guards";
import { askNext, recordAnswer, refreshVoice } from "../agents/orchestrator";
import { NoTranscriptionProvider, transcribe } from "../lib/transcription";

export const interviewRouter = Router({ mergeParams: true });

// 25 MB is roughly 25 minutes of compressed speech — longer than anyone talks
// in one answer, and small enough that a stuck upload fails fast.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

/** Start a sitting, or resume the one that's still open. */
interviewRouter.post("/start", requireUser, ownedBook, async (req, res) => {
  const bookId = req.params.bookId;
  const chapterId = typeof req.body?.chapterId === "string" ? req.body.chapterId : null;

  const open = await one<{ id: string }>(
    `SELECT id FROM interviews WHERE book_id = $1 AND ended_at IS NULL
        AND (chapter_id IS NOT DISTINCT FROM $2)
      ORDER BY started_at DESC LIMIT 1`,
    [bookId, chapterId],
  );

  const interviewId = open?.id ?? id("int");
  if (!open) {
    await query(`INSERT INTO interviews (id, book_id, chapter_id) VALUES ($1,$2,$3)`, [
      interviewId,
      bookId,
      chapterId,
    ]);
    await query(`UPDATE books SET status = 'interviewing', updated_at = now() WHERE id = $1`, [bookId]);
  }

  const turns = await query(
    `SELECT id, role, text, source, created_at FROM turns WHERE interview_id = $1 ORDER BY created_at`,
    [interviewId],
  );
  res.json({ interviewId, resumed: Boolean(open), turns });
});

/** Stop whenever. Nothing is lost; the ledger already holds it. */
interviewRouter.post("/:interviewId/pause", requireUser, ownedBook, async (req, res) => {
  await query(`UPDATE interviews SET ended_at = now() WHERE id = $1 AND book_id = $2`, [
    req.params.interviewId,
    req.params.bookId,
  ]);
  res.json({ ok: true });
});

interviewRouter.post("/:interviewId/next", requireUser, ownedBook, async (req, res, next) => {
  try {
    const chapterId = typeof req.body?.chapterId === "string" ? req.body.chapterId : null;
    const question = await askNext({
      bookId: req.params.bookId,
      interviewId: req.params.interviewId,
      userId: req.user!.id,
      chapterId,
    });
    res.json(question);
  } catch (err) {
    next(err);
  }
});

/**
 * A typed answer.
 *
 * The answer is stored before anything else happens to it — see recordAnswer.
 * Someone who has just spent ten minutes remembering their mother must never
 * be told it didn't save because a downstream agent had a bad minute.
 */
interviewRouter.post("/:interviewId/answer", requireUser, ownedBook, async (req, res, next) => {
  try {
    const parsed = z
      .object({ text: z.string().trim().min(1, "Say something first."), source: z.enum(["text", "voice"]).default("text") })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const result = await recordAnswer({
      bookId: req.params.bookId,
      interviewId: req.params.interviewId,
      userId: req.user!.id,
      text: parsed.data.text,
      source: parsed.data.source,
    });

    const voice = await maybeRefreshVoice(req.params.bookId, req.user!.id);
    res.json({ ...result, voice });
  } catch (err) {
    next(err);
  }
});

/**
 * A spoken answer.
 *
 * The client sends the audio and, when its browser managed one, its own live
 * transcript. Server-side transcription wins when it is configured; otherwise
 * the browser's transcript is used and the author never notices a difference
 * beyond accuracy. Either way the audio's own transcript is stored raw
 * alongside the text, so a later re-transcription can improve an old book.
 */
interviewRouter.post(
  "/:interviewId/voice",
  requireUser,
  ownedBook,
  upload.single("audio"),
  async (req, res, next) => {
    try {
      const fallback = typeof req.body?.transcript === "string" ? req.body.transcript.trim() : "";
      let text = fallback;
      let raw = fallback;
      let seconds = Number(req.body?.seconds ?? 0);

      if (req.file) {
        try {
          const result = await transcribe(req.file.buffer, req.file.mimetype || "audio/webm");
          if (result.text) {
            text = result.text;
            raw = result.text;
            seconds = result.seconds || seconds;
          }
        } catch (err) {
          if (!(err instanceof NoTranscriptionProvider)) {
            console.error("[voice] transcription failed, falling back to browser text", err);
          }
        }
      }

      if (!text) {
        res.status(400).json({
          error:
            "We couldn't hear that. Try again, or type your answer instead — the book doesn't mind which.",
        });
        return;
      }

      const result = await recordAnswer({
        bookId: req.params.bookId,
        interviewId: req.params.interviewId,
        userId: req.user!.id,
        text,
        source: "voice",
        rawTranscript: raw,
        audioSeconds: seconds || undefined,
      });

      const voice = await maybeRefreshVoice(req.params.bookId, req.user!.id);
      res.json({ ...result, text, voice });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Re-fingerprint the voice every eighth author turn.
 *
 * Every turn would be wasteful and would also invalidate the cached prefix of
 * every writing call each time it changed. Never would leave the fingerprint
 * built from the first nervous five minutes of the first session, which is the
 * least representative thing the author will ever say.
 */
async function maybeRefreshVoice(bookId: string, userId: string) {
  const row = await one<{ n: string }>(
    `SELECT COUNT(*) AS n FROM turns WHERE book_id = $1 AND role = 'author'`,
    [bookId],
  );
  const count = Number(row?.n ?? 0);
  if (count === 0 || count % 8 !== 0) return null;
  try {
    return await refreshVoice(bookId, userId);
  } catch (err) {
    console.error("[voice] refresh failed", err);
    return null;
  }
}
