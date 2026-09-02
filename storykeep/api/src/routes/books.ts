import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { id, one, query } from "../lib/db";
import { requireUser } from "../lib/auth";
import { GENRE_LIST, estimatePages, genreOf } from "../genres";
import { AGENT_LIST } from "../agents/roster";
import { planBook } from "../agents/orchestrator";
import { ownedBook } from "./guards";

export const booksRouter = Router();

booksRouter.get("/genres", (_req, res) => {
  res.json({
    genres: GENRE_LIST.map((g) => ({
      key: g.key,
      label: g.label,
      blurb: g.blurb,
      unit: g.unit,
      defaultUnits: g.defaultUnits,
      minUnits: g.minUnits,
      maxUnits: g.maxUnits,
      illustrated: g.illustrated,
      trimSizes: g.trimSizes,
      estimatedPages: estimatePages(g, g.defaultUnits),
    })),
    agents: AGENT_LIST,
  });
});

/**
 * The style seed.
 *
 * Two customers writing about the same childhood in the same town must not get
 * the same book. A per-book seed, fixed at creation and carried in every
 * writing prompt, is what makes the prose diverge — combined with the
 * Originality Guard, which checks that it actually did.
 */
const TEXTURES = [
  "lean and plain-spoken, short sentences, nothing ornamental",
  "warm and discursive, willing to wander before it lands",
  "dry and observational, humour underneath rather than on top",
  "spare and physical, told almost entirely through hands and objects",
  "close and intimate, as though told across a kitchen table late at night",
  "wry and unsentimental, allergic to its own emotion",
  "rhythmic and spoken, built for reading out loud",
  "precise and unhurried, one detail at a time, nothing rushed",
];

const APERTURES = [
  "opens each section on a physical action already in progress",
  "opens each section on something someone said",
  "opens each section on an object, then widens out",
  "opens each section in the middle of a disagreement or a decision",
];

function styleSeed(): string {
  const pick = <T,>(list: T[]): T => list[crypto.randomInt(list.length)];
  return `${pick(TEXTURES)}; ${pick(APERTURES)}`;
}

booksRouter.post("/", requireUser, async (req, res) => {
  const parsed = z
    .object({
      genre: z.enum(["memoir", "kids", "keepsake"]),
      title: z.string().trim().max(200).optional(),
      assistLevel: z.enum(["ghostwriter", "cowriter", "coach"]).default("ghostwriter"),
      units: z.number().int().positive().optional(),
      brief: z.string().trim().max(4000).optional(),
      audience: z.string().trim().max(400).optional(),
      trim: z.string().trim().max(40).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const genre = genreOf(parsed.data.genre);
  const units = Math.min(
    genre.maxUnits,
    Math.max(genre.minUnits, parsed.data.units ?? genre.defaultUnits),
  );
  const bookId = id("bok");

  await query(
    `INSERT INTO books (id, user_id, genre, title, assist_level, style_seed, target_pages, blueprint)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      bookId,
      req.user!.id,
      parsed.data.genre,
      parsed.data.title?.trim() || "Untitled",
      parsed.data.assistLevel,
      styleSeed(),
      estimatePages(genre, units),
      JSON.stringify({
        units,
        brief: parsed.data.brief ?? "",
        audience: parsed.data.audience ?? "",
        trim: parsed.data.trim ?? genre.trimSizes[0].id,
      }),
    ],
  );

  res.json({ book: await one(`SELECT * FROM books WHERE id = $1`, [bookId]) });
});

booksRouter.get("/", requireUser, async (req, res) => {
  const books = await query(
    `SELECT b.*,
            (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id) AS chapter_count,
            (SELECT COUNT(*) FROM chapters c WHERE c.book_id = b.id AND c.current_draft_id IS NOT NULL) AS written_count,
            (SELECT COALESCE(SUM(d.word_count), 0) FROM chapters c
               JOIN drafts d ON d.id = c.current_draft_id WHERE c.book_id = b.id) AS words
       FROM books b WHERE b.user_id = $1 ORDER BY b.updated_at DESC`,
    [req.user!.id],
  );
  res.json({ books });
});

booksRouter.get("/:bookId", requireUser, ownedBook, async (req, res) => {
  const bookId = req.params.bookId;
  const [book, chapters, spreads, reviews, ledger] = await Promise.all([
    one(`SELECT * FROM books WHERE id = $1`, [bookId]),
    query(
      `SELECT c.*, d.word_count, d.body
         FROM chapters c LEFT JOIN drafts d ON d.id = c.current_draft_id
        WHERE c.book_id = $1 ORDER BY c.position`,
      [bookId],
    ),
    query(`SELECT * FROM spreads WHERE book_id = $1 ORDER BY position`, [bookId]),
    query(`SELECT * FROM reviews WHERE book_id = $1 AND resolved = false ORDER BY created_at DESC`, [bookId]),
    query(`SELECT * FROM ledger WHERE book_id = $1 ORDER BY kind, label`, [bookId]),
  ]);
  res.json({ book, chapters, spreads, reviews, ledger });
});

booksRouter.patch("/:bookId", requireUser, ownedBook, async (req, res) => {
  const parsed = z
    .object({
      title: z.string().trim().max(200).optional(),
      subtitle: z.string().trim().max(300).optional(),
      assistLevel: z.enum(["ghostwriter", "cowriter", "coach"]).optional(),
      trim: z.string().trim().max(40).optional(),
      units: z.number().int().positive().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const d = parsed.data;
  await query(
    `UPDATE books
        SET title = COALESCE($2, title),
            subtitle = COALESCE($3, subtitle),
            assist_level = COALESCE($4, assist_level),
            blueprint = blueprint
              || CASE WHEN $5::text IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('trim', $5::text) END
              || CASE WHEN $6::int IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('units', $6::int) END,
            updated_at = now()
      WHERE id = $1`,
    [req.params.bookId, d.title ?? null, d.subtitle ?? null, d.assistLevel ?? null, d.trim ?? null, d.units ?? null],
  );
  res.json({ book: await one(`SELECT * FROM books WHERE id = $1`, [req.params.bookId]) });
});

booksRouter.post("/:bookId/plan", requireUser, ownedBook, async (req, res, next) => {
  try {
    const units = z.number().int().positive().optional().parse(req.body?.units);
    const result = await planBook({ bookId: req.params.bookId, userId: req.user!.id, units });
    const chapters = await query(
      `SELECT * FROM chapters WHERE book_id = $1 ORDER BY position`,
      [req.params.bookId],
    );
    res.json({ ...result, chapters });
  } catch (err) {
    next(err);
  }
});

booksRouter.delete("/:bookId", requireUser, ownedBook, async (req, res) => {
  await query(`DELETE FROM books WHERE id = $1`, [req.params.bookId]);
  res.json({ ok: true });
});
