/**
 * Exercises the whole export pipeline against a seeded book, with no Claude
 * API key and no spend.
 *
 * The exporters are the last thing a paying customer touches and the easiest
 * thing to break without noticing, because a malformed EPUB looks fine until
 * an e-reader rejects it. Run this after touching anything under src/export.
 *
 *   DATABASE_URL=... npm run smoke
 */
import fs from "fs";
import path from "path";
import { migrate, id, query, pool } from "../src/lib/db";
import { renderPdf } from "../src/export/pdf";
import { renderEpub } from "../src/export/epub";
import { renderDocx } from "../src/export/docx";

const OUT = path.resolve("smoke-out");

async function seedProseBook(): Promise<string> {
  const userId = id("usr");
  const bookId = id("bok");
  await query(`INSERT INTO users (id, email, password_hash, display_name) VALUES ($1,$2,$3,$4)`, [
    userId,
    `${userId}@example.test`,
    "x",
    "Ruth Callan",
  ]);
  await query(
    `INSERT INTO books (id, user_id, genre, title, subtitle, style_seed, blueprint)
     VALUES ($1,$2,'memoir','The Woodpile','A life in Ohio','lean and plain-spoken',$3)`,
    [
      bookId,
      userId,
      JSON.stringify({
        trim: "6x9",
        frontMatter: {
          title: "The Woodpile",
          subtitle: "A life in Ohio",
          byline: "As told by Ruth Callan",
          dedication: "For Walter, who never once asked me to be quieter.",
          epigraph: "We didn't have two nickels to rub together and we were fine.",
          authorNote: "I talked, and this is what came out. I have not tidied it up much.",
          backCover: "Ruth Callan was born in 1941 and has lived in the same county ever since.",
        },
      }),
    ],
  );

  for (let i = 0; i < 3; i++) {
    const chapterId = id("chp");
    const draftId = id("drf");
    await query(`INSERT INTO chapters (id, book_id, position, title) VALUES ($1,$2,$3,$4)`, [
      chapterId,
      bookId,
      i,
      ["The Woodpile", "Cadillac Dance Hall", "What Walter Kept"][i],
    ]);
    const body = Array.from(
      { length: 14 },
      (_, p) =>
        `Paragraph ${p + 1} of chapter ${i + 1}. ` +
        "The rain came in sideways off the field and he made me stack it again anyway, " +
        "every last piece, until the pile stood square. [ASK: what year was this?]",
    ).join("\n\n");
    await query(
      `INSERT INTO drafts (id, book_id, chapter_id, version, body, word_count) VALUES ($1,$2,$3,1,$4,$5)`,
      [draftId, bookId, chapterId, body, body.split(/\s+/).length],
    );
    await query(`UPDATE chapters SET current_draft_id = $2 WHERE id = $1`, [chapterId, draftId]);
  }
  return bookId;
}

async function seedPictureBook(): Promise<string> {
  const userId = id("usr");
  const bookId = id("bok");
  await query(`INSERT INTO users (id, email, password_hash, display_name) VALUES ($1,$2,$3,$4)`, [
    userId,
    `${userId}@example.test`,
    "x",
    "Ruth Callan",
  ]);
  await query(
    `INSERT INTO books (id, user_id, genre, title, style_seed, blueprint)
     VALUES ($1,$2,'kids','The Dog Who Would Not','rhythmic and spoken',$3)`,
    [bookId, userId, JSON.stringify({ trim: "8.5x8.5", frontMatter: {
      title: "The Dog Who Would Not",
      subtitle: "",
      byline: "by Ruth Callan",
      dedication: "For Nell.",
      epigraph: "",
      authorNote: "",
      backCover: "A dog. A hill. A disagreement.",
    } })],
  );
  for (let i = 0; i < 12; i++) {
    await query(`INSERT INTO spreads (id, book_id, position, text) VALUES ($1,$2,$3,$4)`, [
      id("spr"),
      bookId,
      i,
      `Nell would not go up the hill. Not for cheese. Not for anything. (spread ${i + 1})`,
    ]);
  }
  return bookId;
}

async function main(): Promise<void> {
  await migrate();
  fs.mkdirSync(OUT, { recursive: true });

  const cases: [string, string][] = [
    ["memoir", await seedProseBook()],
    ["picturebook", await seedPictureBook()],
  ];

  let failures = 0;
  for (const [label, bookId] of cases) {
    for (const [format, render] of [
      ["pdf", renderPdf],
      ["epub", renderEpub],
      ["docx", renderDocx],
    ] as const) {
      try {
        const buffer = await render(bookId);
        const file = path.join(OUT, `${label}.${format}`);
        fs.writeFileSync(file, buffer);
        checkMagic(format, buffer);
        console.log(`  ok   ${label}.${format}  ${(buffer.length / 1024).toFixed(1)} KB`);
      } catch (err) {
        failures++;
        console.error(`  FAIL ${label}.${format}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  await pool?.end();
  console.log(failures ? `\n${failures} export(s) failed.` : `\nAll exports rendered into ${OUT}/`);
  process.exit(failures ? 1 : 0);
}

/**
 * A byte-level check, because every one of these formats will happily write a
 * file that is the wrong thing. An EPUB in particular must begin with a zip
 * whose first entry is an uncompressed `mimetype`, or readers reject it.
 */
function checkMagic(format: string, buffer: Buffer): void {
  if (format === "pdf" && buffer.subarray(0, 5).toString() !== "%PDF-") {
    throw new Error("not a PDF");
  }
  if (format === "epub" || format === "docx") {
    if (buffer.subarray(0, 2).toString() !== "PK") throw new Error("not a zip container");
  }
  if (format === "epub") {
    const head = buffer.subarray(0, 80).toString("latin1");
    if (!head.includes("mimetype")) throw new Error("mimetype is not the first zip entry");
    if (!head.includes("application/epub+zip")) {
      throw new Error("mimetype entry is compressed — readers will reject this file");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
