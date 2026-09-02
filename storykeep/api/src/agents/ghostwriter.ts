import { runText } from "../lib/claude";
import { agentHeader } from "./context";
import { effortFor, modelFor } from "./roster";
import { AGENTS } from "./roster";
import type { GenreSpec } from "../genres";
import type { AssistLevel } from "../genres";

/**
 * Quill.
 *
 * The agent the whole product exists to run. Everything else — the interview,
 * the ledger, the voice fingerprint, the outline — is scaffolding to make this
 * one call produce pages a family would keep.
 */
export async function draftChapter(args: {
  bookId: string;
  userId: string;
  bible: string;
  genre: GenreSpec;
  assist: AssistLevel;
  chapterTitle: string;
  chapterBrief: string;
  sourceMaterial: string;
  /** Present when the author has already written or edited something here. */
  existingText?: string;
  targetWords: number;
}): Promise<string> {
  const { genre, targetWords } = args;

  const modeRules =
    args.assist === "coach"
      ? `The author is in COACH mode. You must not write the chapter. Instead
return: three concrete ways into this chapter, the single scene you think it
must contain and why, and five specific questions whose answers would make it
writable. Prose paragraphs, no headings, no bullet salad.`
      : args.assist === "cowriter"
        ? `The author is in CO-WRITER mode. Where they have already written
something, their wording stands — work around it, join to it, and do not
rewrite it into your own cadence. Draft the parts they have not written.`
        : `The author is in GHOSTWRITER mode. Write the finished chapter. No
placeholders, no notes to self, no "[insert detail]" other than genuine
[ASK: ...] markers where a fact is missing.`;

  const system = `${agentHeader("ghostwriter")}

${args.bible}

---

${modeRules}

---

HOW YOU WRITE THIS ${genre.unit === "spread" ? "SPREAD" : "CHAPTER"}

Target roughly ${targetWords} words. Being under is better than padding.

Write only from the source material and the ledger. Where a needed fact is
absent, write around it, or place a single [ASK: the exact question] inline.
${AGENTS.interviewer.name} will ask it and the chapter gets rewritten. Never
invent the fact. This is a real person's life.

Open inside something happening. No throat-clearing, no scene-setting
paragraph before the scene.

Prefer what was said and done to what was felt. Report the feeling once, at
most, and only where the author reported it.

Vary your sentence lengths the way speech does. Three medium sentences in a row
is the sound of a machine.

Return the ${genre.unit} text only. No title line, no headings, no commentary,
no markdown. Plain paragraphs separated by blank lines.`;

  const content = args.existingText
    ? `Chapter: ${args.chapterTitle}\n\nWhat this chapter must do:\n${args.chapterBrief}\n\nWhat the author has already written here (their words are correct — build around them):\n\n${args.existingText}\n\nSource material from the interviews:\n\n${args.sourceMaterial}`
    : `Chapter: ${args.chapterTitle}\n\nWhat this chapter must do:\n${args.chapterBrief}\n\nSource material from the interviews:\n\n${args.sourceMaterial}`;

  return runText({
    agent: "ghostwriter",
    userId: args.userId,
    bookId: args.bookId,
    model: modelFor("ghostwriter"),
    effort: effortFor("ghostwriter"),
    system,
    maxTokens: 32_000,
    messages: [{ role: "user", content }],
  });
}

/**
 * The illustrated forms are written as a whole, not spread by spread — page
 * turns only work if one mind holds all of them at once.
 */
export async function draftSpreads(args: {
  bookId: string;
  userId: string;
  bible: string;
  genre: GenreSpec;
  outlineBriefs: { title: string; brief: string }[];
  sourceMaterial: string;
}): Promise<string[]> {
  const count = args.outlineBriefs.length;
  const system = `${agentHeader("ghostwriter")}

${args.bible}

---

You are writing all ${count} spreads at once, because a page turn only works if
one mind holds the whole book. Keep the total under 700 words across every
spread combined.

Return exactly ${count} spreads separated by a line containing only ---
No spread numbers, no titles, no art notes, no commentary. Just the words that
will be printed, spread by spread, in order.`;

  const briefs = args.outlineBriefs
    .map((b, i) => `Spread ${i + 1} — ${b.title}\n${b.brief}`)
    .join("\n\n");

  const text = await runText({
    agent: "ghostwriter",
    userId: args.userId,
    bookId: args.bookId,
    model: modelFor("ghostwriter"),
    effort: effortFor("ghostwriter"),
    system,
    maxTokens: 16_000,
    messages: [
      {
        role: "user",
        content: `The plan:\n\n${briefs}\n\nWhat the author told us:\n\n${args.sourceMaterial}\n\nWrite the book.`,
      },
    ],
  });

  const parts = text
    .split(/^\s*---\s*$/m)
    .map((s) => s.trim())
    .filter(Boolean);
  // A model that returns 13 spreads for a 14-spread plan must not silently
  // shift every later spread's art brief onto the wrong text.
  while (parts.length < count) parts.push("");
  return parts.slice(0, count);
}
