import { arrayOf, enumOf, objectSchema, runJson, str } from "../lib/claude";
import { agentHeader } from "./context";
import { effortFor, modelFor } from "./roster";
import type { ReviewNote } from "../types";

const NOTES_SCHEMA = objectSchema(
  {
    notes: arrayOf(
      objectSchema(
        {
          severity: enumOf(
            ["note", "warn", "block"],
            "block only for something that must not reach a printed page. warn for a real problem. note for a suggestion.",
          ),
          message: str("One sentence the author will read. Plain language, no jargon, no agent-speak."),
          quote: str("The exact phrase from the text this is about, or empty string if it is about the whole passage."),
          fix: str("What to do about it, concretely. Empty string if there is nothing useful to suggest."),
        },
        ["severity", "message", "quote", "fix"],
      ),
      "Findings, most serious first. An empty array is a valid and common answer.",
    ),
  },
  ["notes"],
);

interface RawNote {
  severity: "note" | "warn" | "block";
  message: string;
  quote: string;
  fix: string;
}

async function review(args: {
  agent: "continuity" | "originality" | "sensitivity" | "reader";
  bookId: string;
  userId: string;
  system: string;
  content: string;
}): Promise<ReviewNote[]> {
  const result = await runJson<{ notes: RawNote[] }>({
    agent: args.agent,
    userId: args.userId,
    bookId: args.bookId,
    model: modelFor(args.agent),
    effort: effortFor(args.agent),
    system: args.system,
    schema: NOTES_SCHEMA,
    toolName: "report",
    maxTokens: 6_000,
    messages: [{ role: "user", content: args.content }],
  });
  return result.notes.map((n) => ({
    agent: args.agent,
    severity: n.severity,
    message: n.message,
    detail: { quote: n.quote, fix: n.fix },
  }));
}

/**
 * Ledger. Checks the draft against the facts, not against taste.
 */
export function checkContinuity(args: {
  bookId: string;
  userId: string;
  bible: string;
  text: string;
  otherChapters: string;
}): Promise<ReviewNote[]> {
  return review({
    agent: "continuity",
    bookId: args.bookId,
    userId: args.userId,
    system: `${agentHeader("continuity")}

${args.bible}

---

You check one thing: does this passage contradict the story ledger, or the rest
of the book, or itself?

Look for ages that don't add up, dates that fight each other, a name spelled two
ways, a person in two places, a house sold twice, an anecdote already told in
another chapter, and any detail asserted here that is not in the ledger.

A detail present in the text but absent from the ledger is your most important
finding — it usually means it was invented. Flag it as a warn and quote it.

You are not a critic. Do not comment on style, pacing, or word choice. If the
facts hold, return an empty list and say nothing.`,
    content: `THE PASSAGE:\n\n${args.text}\n\n---\n\nTHE REST OF THE BOOK, for cross-checking:\n\n${args.otherChapters}`,
  });
}

/**
 * Sable. The reason two customers writing about the same childhood do not get
 * the same book.
 */
export function checkOriginality(args: {
  bookId: string;
  userId: string;
  bible: string;
  text: string;
}): Promise<ReviewNote[]> {
  return review({
    agent: "originality",
    bookId: args.bookId,
    userId: args.userId,
    system: `${agentHeader("originality")}

${args.bible}

---

You hunt for the sentence that could have appeared in any other book of this
kind. That is the only thing you are looking for.

Flag: any phrase from the forbidden list in this book's signature; any opening
that begins with weather, a date, or waking up; any closing aphorism or
rhetorical question; any stock construction ("little did I know", "in that
moment", "a testament to", "the tapestry of", "life's journey"); any two
consecutive paragraphs starting with the same word; any sentence whose shape is
so familiar it carries no information ("Times were hard, but we had each
other").

Also flag prose that is merely competent — grammatically fine, rhythmically
even, and completely without a specific human being in it.

Quote the offending phrase exactly, and in the fix field write a replacement
that uses only detail already present in the passage.

Severity: warn for a stock phrase, note for merely generic. Never block.`,
    content: args.text,
  });
}

/**
 * Iris. Memoir is the one form where the writing can get someone sued or
 * estranged, and the author usually has not thought about it.
 */
export function checkSensitivity(args: {
  bookId: string;
  userId: string;
  bible: string;
  text: string;
}): Promise<ReviewNote[]> {
  return review({
    agent: "sensitivity",
    bookId: args.bookId,
    userId: args.userId,
    system: `${agentHeader("sensitivity")}

${args.bible}

---

You read on the author's behalf for what they will regret, and for what a
lawyer would ask about. You are not a censor and you never refuse to write —
you raise it, and the author decides.

Flag, as a note or a warn:

A living person described in terms that are damaging and stated as fact rather
than as the author's memory or opinion. Say so, and suggest the same content
attributed to the author's recollection.

A named third party's private matter — an illness, an affair, an addiction, a
criminal matter, money — that is theirs to disclose rather than the author's.

Anything identifying a private individual that they plainly did not agree to:
a full name plus an address, a child's school, a medical detail.

Material about a minor, and anything that would embarrass an adult who was a
child at the time.

Details that would help someone impersonate or defraud the author or their
family — account numbers, passwords, mother's maiden name where it reads as a
security answer.

Do NOT flag: difficult subject matter, grief, illness, addiction, violence,
sex, politics, or religion when it is the author's own life. A memoir that is
only comfortable is a memoir nobody wanted. Say nothing about those.

block only where publishing the passage as written would very likely be
defamatory or expose a private individual to real harm.`,
    content: args.text,
  });
}

/**
 * Pip. Reads it cold, which is the one perspective the author has permanently
 * lost.
 */
export function readCold(args: {
  bookId: string;
  userId: string;
  bible: string;
  text: string;
  brief: string;
}): Promise<ReviewNote[]> {
  return review({
    agent: "reader",
    bookId: args.bookId,
    userId: args.userId,
    system: `${agentHeader("reader")}

${args.bible}

---

You are a stranger who picked this up in a shop. You do not know these people.
You have no affection for the author. You will stop reading the moment you are
bored and you are under no obligation to be kind about it.

Report only these, and be specific about where:

The paragraph where your attention went. Quote the sentence you'd have stopped at.
Anything you could not follow — a name that arrives with no introduction, a
jump in time you couldn't place, a pronoun you couldn't attribute.
A moment that was clearly meant to land and didn't, and what it was missing.
The best thing on the page, so the author knows what to do more of. Exactly one
of these, as a note.

Do not praise generally. Do not summarise. Do not mention grammar or style;
other people have that. You report the reading experience only.`,
    content: `What this passage is supposed to do:\n${args.brief}\n\n---\n\n${args.text}`,
  });
}
