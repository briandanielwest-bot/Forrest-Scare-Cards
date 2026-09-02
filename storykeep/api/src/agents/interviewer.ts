import { runJson } from "../lib/claude";
import { agentHeader } from "./context";
import { effortFor, modelFor } from "./roster";
import type { GenreSpec } from "../genres";
import type { BookRow, LedgerRow, TurnRow } from "../types";
import { arrayOf, bool, objectSchema, str } from "../lib/claude";

export interface NextQuestion {
  question: string;
  /** Shown under the question so the author knows why they're being asked. */
  why: string;
  /** Wren's short human reaction to what was just said. Empty on the first question. */
  acknowledgement: string;
  bankId: string | null;
  enoughForThisChapter: boolean;
}

const SCHEMA = objectSchema(
  {
    acknowledgement: str(
      "One or two sentences reacting to what the author just said, the way a real interviewer would. Specific to their answer. Empty string if this is the first question of the session.",
    ),
    question: str("The single next question, phrased to be read aloud. One question, not three."),
    why: str("One short line telling the author what this question is for."),
    bankId: str("The id of the bank question this came from, or empty string if it is a follow-up you invented."),
    enoughForThisChapter: bool(
      "True only when there is genuinely enough material to write this section well. Be honest — saying yes early produces thin chapters.",
    ),
  },
  ["acknowledgement", "question", "why", "bankId", "enoughForThisChapter"],
);

/**
 * Wren.
 *
 * The hard part of this job is not asking questions, it is knowing when the
 * answer was thin. People answer "what was your father like?" with an
 * adjective and believe they have told you something. The interviewer's real
 * skill is noticing that and asking for the woodpile.
 */
export async function nextQuestion(args: {
  book: BookRow;
  genre: GenreSpec;
  bible: string;
  ledger: LedgerRow[];
  recent: TurnRow[];
  asked: string[];
  chapterTitle?: string;
  chapterBrief?: string | null;
  userId: string;
}): Promise<NextQuestion> {
  const { book, genre, bible, recent, asked } = args;

  const remaining = genre.questions.filter((q) => !asked.includes(q.id));
  const bank = remaining
    .map(
      (q) =>
        `[${q.id}] (${q.depth}) ${q.ask}\n    purpose: ${q.purpose}\n    probes: ${q.probes.join(" / ")}`,
    )
    .join("\n");

  const system = `${agentHeader("interviewer")}

${bible}

---

HOW YOU INTERVIEW

You are talking to someone who can tell a story out loud but will not sit and
write one. Everything you do serves that: short questions, one at a time, no
jargon, no lists. You are on a phone call, not filling in a form.

Ask ONE question. Never two. Never a question with an "and" that is secretly
two questions.

React first, then ask. A person who has just told you their mother died and
gets back a fresh question with no acknowledgement stops talking. One human
sentence, then the question.

Chase the concrete. When an answer is an adjective ("he was strict", "it was
hard"), your next question asks for the specific occasion. "Tell me about a
time he was strict." "What happened that week?"

Follow the tangent when the tangent is better than your plan. The bank is a
resource, not a script. If they mention a brother you have never heard of,
that is now the most interesting thing in the room.

Come back. After a tangent, return to the thread — people find it reassuring
that someone is holding the shape of the conversation for them.

Never ask a question already answered in the story ledger. Checking is your job,
not theirs.

Never rush to finish. Set enoughForThisChapter true only when you could hand
the material to a writer and expect real pages back — that usually means at
least one full scene with people, place, and something said out loud.

Do not comment on the book being written, the process, or your own role, unless
the author asks. You are here to listen.

${args.chapterTitle ? `RIGHT NOW you are gathering material for: "${args.chapterTitle}".\n${args.chapterBrief ?? ""}` : "RIGHT NOW you are in the opening interview, finding the shape of the whole book."}

THE QUESTION BANK still available to you (use one when it fits; invent a
follow-up when the conversation has earned a better question):

${bank || "(bank exhausted — invent from here, guided by the ledger's gaps)"}`;

  const transcript = recent
    .map((t) => `${t.role === "agent" ? "You" : "Author"}: ${t.text}`)
    .join("\n\n");

  return runJson<NextQuestion>({
    agent: "interviewer",
    userId: args.userId,
    bookId: book.id,
    model: modelFor("interviewer"),
    effort: effortFor("interviewer"),
    system,
    schema: SCHEMA,
    toolName: "ask",
    toolDescription: "Deliver your acknowledgement and the single next question.",
    maxTokens: 2_000,
    messages: [
      {
        role: "user",
        content: transcript
          ? `Here is the conversation so far:\n\n${transcript}\n\nGive me your next question.`
          : `This is the very start of the session. Open the interview.`,
      },
    ],
  });
}
