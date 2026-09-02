import { id, one, query } from "../lib/db";
import { assertWithinBudget } from "../lib/spend";
import { bookBible, genreSpec } from "./context";
import { draftChapter, draftSpreads } from "./ghostwriter";
import { lineEdit } from "./editor";
import { checkContinuity, checkOriginality, checkSensitivity, readCold } from "./reviewers";
import { extractFacts } from "./listener";
import { buildVoiceProfile } from "./voice";
import { buildOutline } from "./architect";
import { nextQuestion, type NextQuestion } from "./interviewer";
import type { GenreSpec } from "../genres";
import { estimatePages } from "../genres";
import type { BookRow, ChapterRow, LedgerRow, ReviewNote, TurnRow, VoiceProfile } from "../types";

/**
 * The router. Not a persona — the only thing here that never talks to the
 * author, and the only thing that knows the order the crew runs in.
 */

export interface BookContext {
  book: BookRow;
  genre: GenreSpec;
  ledger: LedgerRow[];
  voice: VoiceProfile | null;
  /** The cached system prefix every craft agent shares. */
  bible: string;
  /** The book's trim, expressed the way an image renderer wants it. */
  trimAspect: string;
}

export async function loadContext(bookId: string): Promise<BookContext> {
  const book = await one<BookRow>(`SELECT * FROM books WHERE id = $1`, [bookId]);
  if (!book) throw new Error("Book not found");
  const genre = genreSpec(book.genre);
  const ledger = await query<LedgerRow>(
    `SELECT * FROM ledger WHERE book_id = $1 ORDER BY id`,
    [bookId],
  );
  const voice = book.voice_profile ?? null;
  return {
    book,
    genre,
    ledger,
    voice,
    bible: bookBible({ book, genre, ledger, voice }),
    trimAspect: aspectOf(book, genre),
  };
}

/**
 * Renderers take an aspect ratio, not inches, and only accept a short list of
 * them — so the trim is snapped to the nearest supported ratio rather than
 * passed through, which would fail the request outright.
 */
function aspectOf(book: BookRow, genre: GenreSpec): string {
  const trim =
    genre.trimSizes.find((t) => t.id === book.blueprint.trim) ?? genre.trimSizes[0];
  const ratio = trim.widthIn / trim.heightIn;
  const supported: [string, number][] = [
    ["1:1", 1],
    ["4:5", 0.8],
    ["3:4", 0.75],
    ["2:3", 0.667],
    ["5:4", 1.25],
    ["4:3", 1.333],
    ["3:2", 1.5],
  ];
  return supported.reduce((best, option) =>
    Math.abs(option[1] - ratio) < Math.abs(best[1] - ratio) ? option : best,
  )[0];
}

/** Everything the author has said, oldest first, as one readable transcript. */
export async function transcriptOf(bookId: string, limit = 400): Promise<string> {
  const turns = await query<TurnRow>(
    `SELECT * FROM turns WHERE book_id = $1 ORDER BY created_at LIMIT $2`,
    [bookId, limit],
  );
  return turns.map((t) => `${t.role === "agent" ? "Q" : "A"}: ${t.text}`).join("\n\n");
}

// ---------------------------------------------------------------- interview

export async function askNext(args: {
  bookId: string;
  interviewId: string;
  userId: string;
  chapterId?: string | null;
}): Promise<NextQuestion> {
  await assertWithinBudget(args.userId);
  const ctx = await loadContext(args.bookId);

  // Only the tail of the conversation goes in the prompt; the ledger carries
  // everything older. That keeps the interview call flat-cost no matter how
  // many hours the author has already talked.
  const recent = (
    await query<TurnRow>(
      `SELECT * FROM turns WHERE interview_id = $1 ORDER BY created_at DESC LIMIT 12`,
      [args.interviewId],
    )
  ).reverse();

  const asked = (
    await query<{ agenda: { askedIds?: string[] } }>(
      `SELECT agenda FROM interviews WHERE book_id = $1`,
      [args.bookId],
    )
  ).flatMap((r) => r.agenda?.askedIds ?? []);

  let chapter: ChapterRow | null = null;
  if (args.chapterId) {
    chapter = await one<ChapterRow>(`SELECT * FROM chapters WHERE id = $1`, [args.chapterId]);
  }

  const result = await nextQuestion({
    book: ctx.book,
    genre: ctx.genre,
    bible: ctx.bible,
    ledger: ctx.ledger,
    recent,
    asked,
    chapterTitle: chapter?.title,
    chapterBrief: chapter?.brief ?? null,
    userId: args.userId,
  });

  await query(
    `INSERT INTO turns (id, interview_id, book_id, role, text, source)
     VALUES ($1,$2,$3,'agent',$4,'text')`,
    [id("trn"), args.interviewId, args.bookId, result.question],
  );

  if (result.bankId) {
    await query(
      `UPDATE interviews
          SET agenda = jsonb_set(agenda, '{askedIds}',
                COALESCE(agenda->'askedIds', '[]'::jsonb) || to_jsonb($2::text), true)
        WHERE id = $1`,
      [args.interviewId, result.bankId],
    );
  }
  return result;
}

/**
 * An author turn: store it verbatim, then file what it established.
 *
 * The storing happens first and separately, so a failure in the extraction
 * agent can never cost the author the thing they just said.
 */
export async function recordAnswer(args: {
  bookId: string;
  interviewId: string;
  userId: string;
  text: string;
  source: "text" | "voice";
  rawTranscript?: string;
  audioSeconds?: number;
}): Promise<{ turnId: string; facts: number }> {
  const turnId = id("trn");
  await query(
    `INSERT INTO turns (id, interview_id, book_id, role, text, source, raw_transcript, audio_seconds)
     VALUES ($1,$2,$3,'author',$4,$5,$6,$7)`,
    [
      turnId,
      args.interviewId,
      args.bookId,
      args.text,
      args.source,
      args.rawTranscript ?? null,
      args.audioSeconds ?? null,
    ],
  );

  let facts = 0;
  try {
    const ctx = await loadContext(args.bookId);
    const lastQuestion = await one<{ text: string }>(
      `SELECT text FROM turns WHERE interview_id = $1 AND role = 'agent'
        ORDER BY created_at DESC LIMIT 1`,
      [args.interviewId],
    );
    const extracted = await extractFacts({
      bookId: args.bookId,
      userId: args.userId,
      bible: ctx.bible,
      question: lastQuestion?.text ?? "",
      answer: args.text,
    });
    for (const f of extracted.facts) {
      await query(
        `INSERT INTO ledger (id, book_id, kind, label, detail, when_text, confidence, source_turn)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id("led"), args.bookId, f.kind, f.label, f.detail, f.whenText || null, f.confidence, turnId],
      );
    }
    facts = extracted.facts.length;
  } catch (err) {
    // The answer is already saved. A failed extraction is a background job to
    // retry, not a reason to tell someone their story didn't record.
    console.error("[listener] extraction failed", err);
  }

  await query(`UPDATE books SET updated_at = now() WHERE id = $1`, [args.bookId]);
  return { turnId, facts };
}

/** Re-fingerprints the author's voice. Cheap enough to run every few turns. */
export async function refreshVoice(bookId: string, userId: string): Promise<VoiceProfile | null> {
  const turns = await query<TurnRow>(
    `SELECT * FROM turns WHERE book_id = $1 AND role = 'author' ORDER BY created_at LIMIT 60`,
    [bookId],
  );
  const words = turns.reduce((n, t) => n + t.text.split(/\s+/).length, 0);
  // Below roughly 400 words a fingerprint is a guess dressed as evidence, and
  // a wrong one poisons every chapter it is cached into.
  if (words < 400) return null;

  const profile = await buildVoiceProfile({
    bookId,
    userId,
    transcript: turns.map((t) => t.text).join("\n\n"),
  });
  await query(`UPDATE books SET voice_profile = $2, updated_at = now() WHERE id = $1`, [
    bookId,
    JSON.stringify(profile),
  ]);
  return profile;
}

// ----------------------------------------------------------------- outline

export async function planBook(args: {
  bookId: string;
  userId: string;
  units?: number;
}): Promise<{ units: number; pages: number }> {
  await assertWithinBudget(args.userId);
  const ctx = await loadContext(args.bookId);
  const target = clamp(
    args.units ?? ctx.book.blueprint.units ?? ctx.genre.defaultUnits,
    ctx.genre.minUnits,
    ctx.genre.maxUnits,
  );

  const outline = await buildOutline({
    bookId: args.bookId,
    userId: args.userId,
    bible: ctx.bible,
    genre: ctx.genre,
    targetUnits: target,
    transcriptDigest: await transcriptOf(args.bookId),
  });

  // Replacing an outline must not orphan written chapters, so existing
  // chapters are matched by position and updated rather than deleted.
  const existing = await query<ChapterRow>(
    `SELECT * FROM chapters WHERE book_id = $1 ORDER BY position`,
    [args.bookId],
  );

  for (let i = 0; i < outline.units.length; i++) {
    const unit = outline.units[i];
    const current = existing[i];
    if (current) {
      await query(`UPDATE chapters SET title = $2, brief = $3, updated_at = now() WHERE id = $1`, [
        current.id,
        unit.title,
        unit.brief,
      ]);
    } else {
      await query(
        `INSERT INTO chapters (id, book_id, position, title, brief) VALUES ($1,$2,$3,$4,$5)`,
        [id("chp"), args.bookId, i, unit.title, unit.brief],
      );
    }
  }
  // Trailing chapters beyond the new outline are only removed when empty.
  for (const stale of existing.slice(outline.units.length)) {
    if (!stale.current_draft_id) {
      await query(`DELETE FROM chapters WHERE id = $1`, [stale.id]);
    }
  }

  if (ctx.genre.illustrated) {
    const spreads = await query<{ id: string }>(`SELECT id FROM spreads WHERE book_id = $1`, [
      args.bookId,
    ]);
    if (spreads.length === 0) {
      for (let i = 0; i < outline.units.length; i++) {
        await query(`INSERT INTO spreads (id, book_id, position) VALUES ($1,$2,$3)`, [
          id("spr"),
          args.bookId,
          i,
        ]);
      }
    }
  }

  await query(
    `UPDATE books
        SET title = $2, subtitle = NULLIF($3,''),
            blueprint = blueprint || jsonb_build_object('shape', $4::text, 'units', $5::int),
            status = 'outlined', updated_at = now()
      WHERE id = $1`,
    [args.bookId, outline.bookTitle, outline.subtitle, outline.shape, outline.units.length],
  );

  return { units: outline.units.length, pages: estimatePages(ctx.genre, outline.units.length) };
}

// ------------------------------------------------------------------ write

export interface WriteResult {
  draftId: string;
  text: string;
  wordCount: number;
  notes: ReviewNote[];
}

/**
 * The full pipeline for one chapter: draft, then four independent readers in
 * parallel, then one edit pass carrying their findings.
 *
 * The readers run concurrently because they do not depend on each other and
 * serialising them would triple the wait an author sits through. The edit runs
 * last because it is the only agent allowed to change the text.
 */
export async function writeChapter(args: {
  bookId: string;
  chapterId: string;
  userId: string;
  /** Skip the review pass — used for a fast first look. */
  quick?: boolean;
}): Promise<WriteResult> {
  await assertWithinBudget(args.userId);
  const ctx = await loadContext(args.bookId);
  const chapter = await one<ChapterRow>(`SELECT * FROM chapters WHERE id = $1`, [args.chapterId]);
  if (!chapter) throw new Error("Chapter not found");

  const existing = chapter.current_draft_id
    ? await one<{ body: string }>(`SELECT body FROM drafts WHERE id = $1`, [chapter.current_draft_id])
    : null;

  const targetWords = Math.round(
    (ctx.genre.wordsPerUnit.low + ctx.genre.wordsPerUnit.high) / 2,
  );

  let text = await draftChapter({
    bookId: args.bookId,
    userId: args.userId,
    bible: ctx.bible,
    genre: ctx.genre,
    assist: ctx.book.assist_level,
    chapterTitle: chapter.title,
    chapterBrief: chapter.brief ?? "",
    sourceMaterial: await transcriptOf(args.bookId),
    existingText: ctx.book.assist_level === "cowriter" ? (existing?.body ?? undefined) : undefined,
    targetWords,
  });

  let notes: ReviewNote[] = [];
  if (!args.quick && ctx.book.assist_level !== "coach") {
    const others = await siblingChapters(args.bookId, args.chapterId);
    const settled = await Promise.allSettled([
      checkContinuity({ ...common(ctx, args), text, otherChapters: others }),
      checkOriginality({ ...common(ctx, args), text }),
      checkSensitivity({ ...common(ctx, args), text }),
      readCold({ ...common(ctx, args), text, brief: chapter.brief ?? "" }),
    ]);
    for (const result of settled) {
      if (result.status === "fulfilled") notes = notes.concat(result.value);
      else console.error("[reviewer] failed", result.reason);
    }

    const actionable = notes
      .filter((n) => n.severity !== "note")
      .map((n) => `${n.message}${fixOf(n) ? ` — ${fixOf(n)}` : ""}`);
    if (actionable.length) {
      text = await lineEdit({
        bookId: args.bookId,
        userId: args.userId,
        bible: ctx.bible,
        text,
        notes: actionable,
      });
    }
  }

  const version =
    (
      await one<{ v: number }>(
        `SELECT COALESCE(MAX(version), 0) + 1 AS v FROM drafts WHERE chapter_id = $1`,
        [args.chapterId],
      )
    )?.v ?? 1;

  const draftId = id("drf");
  const wordCount = countWords(text);
  await query(
    `INSERT INTO drafts (id, book_id, chapter_id, version, body, word_count, authored_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [draftId, args.bookId, args.chapterId, version, text, wordCount, "ghostwriter", JSON.stringify({ notes })],
  );
  await query(
    `UPDATE chapters SET current_draft_id = $2, status = 'drafted', updated_at = now() WHERE id = $1`,
    [args.chapterId, draftId],
  );

  await query(`DELETE FROM reviews WHERE chapter_id = $1 AND resolved = false`, [args.chapterId]);
  for (const n of notes) {
    await query(
      `INSERT INTO reviews (id, book_id, chapter_id, agent, severity, message, detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id("rev"), args.bookId, args.chapterId, n.agent, n.severity, n.message, JSON.stringify(n.detail ?? {})],
    );
  }

  return { draftId, text, wordCount, notes };
}

/** Kids and keepsake books are written whole, then illustrated. */
export async function writeIllustrated(args: {
  bookId: string;
  userId: string;
}): Promise<{ spreads: { position: number; text: string }[] }> {
  await assertWithinBudget(args.userId);
  const ctx = await loadContext(args.bookId);
  const chapters = await query<ChapterRow>(
    `SELECT * FROM chapters WHERE book_id = $1 ORDER BY position`,
    [args.bookId],
  );
  if (!chapters.length) throw new Error("Plan the book before writing it.");

  const texts = await draftSpreads({
    bookId: args.bookId,
    userId: args.userId,
    bible: ctx.bible,
    genre: ctx.genre,
    outlineBriefs: chapters.map((c) => ({ title: c.title, brief: c.brief ?? "" })),
    sourceMaterial: await transcriptOf(args.bookId),
  });

  const out: { position: number; text: string }[] = [];
  for (let i = 0; i < texts.length; i++) {
    await query(
      `INSERT INTO spreads (id, book_id, position, text)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO NOTHING`,
      [id("spr"), args.bookId, i, texts[i]],
    );
    await query(
      `UPDATE spreads SET text = $3, updated_at = now() WHERE book_id = $1 AND position = $2`,
      [args.bookId, i, texts[i]],
    );
    out.push({ position: i, text: texts[i] });
  }
  await query(`UPDATE books SET status = 'drafted', updated_at = now() WHERE id = $1`, [args.bookId]);
  return { spreads: out };
}

// ---------------------------------------------------------------- helpers

function common(ctx: BookContext, args: { bookId: string; userId: string }) {
  return { bookId: args.bookId, userId: args.userId, bible: ctx.bible };
}

function fixOf(note: ReviewNote): string {
  const detail = note.detail as { fix?: string } | undefined;
  return detail?.fix ?? "";
}

async function siblingChapters(bookId: string, exceptId: string): Promise<string> {
  const rows = await query<{ title: string; body: string }>(
    `SELECT c.title, d.body FROM chapters c
       JOIN drafts d ON d.id = c.current_draft_id
      WHERE c.book_id = $1 AND c.id <> $2
      ORDER BY c.position`,
    [bookId, exceptId],
  );
  // Only the opening of each sibling: continuity conflicts surface in facts,
  // and shipping every written chapter into every review call is how a
  // fourteen-chapter memoir becomes quadratically expensive.
  return rows.map((r) => `## ${r.title}\n${r.body.slice(0, 1200)}`).join("\n\n");
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
