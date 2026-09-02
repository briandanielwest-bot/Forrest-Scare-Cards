import { arrayOf, enumOf, num, objectSchema, runJson, str } from "../lib/claude";
import { agentHeader } from "./context";
import { effortFor, modelFor } from "./roster";

export interface ExtractedFact {
  kind: "person" | "place" | "date" | "event" | "object" | "theme" | "quote";
  label: string;
  detail: string;
  whenText: string;
  confidence: number;
}

const SCHEMA = objectSchema(
  {
    facts: arrayOf(
      objectSchema(
        {
          kind: enumOf(
            ["person", "place", "date", "event", "object", "theme", "quote"],
            "What sort of thing this is.",
          ),
          label: str("The short name of it. 'Aunt Dorothy', 'the Ford Falcon', 'the winter of 1974'."),
          detail: str("What we now know about it, in one or two sentences, in plain words."),
          whenText: str(
            "When it happened, in the author's own vagueness — 'sometime in the sixties', 'the year after the wedding'. Empty string if unknown. Never guess a precise date.",
          ),
          confidence: num("0 to 1. Below 0.6 if the author sounded unsure or was speculating."),
        },
        ["kind", "label", "detail", "whenText", "confidence"],
      ),
      "Everything newly established. Empty array if the answer added nothing factual.",
    ),
    openThreads: arrayOf(
      str("Something the author mentioned in passing that is clearly a story and was not followed up."),
      "Loose threads worth returning to. These become future questions.",
    ),
  },
  ["facts", "openThreads"],
);

/**
 * Echo.
 *
 * Runs after every author turn. This is the agent that makes chapter fourteen
 * remember what was said in chapter two, and it is the reason the Ghostwriter
 * never has to be handed an eighty-thousand-word transcript.
 */
export async function extractFacts(args: {
  bookId: string;
  userId: string;
  bible: string;
  question: string;
  answer: string;
}): Promise<{ facts: ExtractedFact[]; openThreads: string[] }> {
  const system = `${agentHeader("listener")}

${args.bible}

---

WHAT YOU DO

Read one answer and file what is now known. You are a records clerk with a good
ear, not a writer and not an interpreter.

Record only what the author actually said or unmistakably implied. If they said
"my brother", record a person called "the author's brother" — do not name him.
If they said "we were poor", that is a theme, not a date.

Split compound facts. "I met Ruth at the Cadillac dance hall in '58" is three
entries: a person, a place, and a date, each linked by their details.

Capture exact words as quotes when the author reports speech. Those lines are
the most valuable thing in the whole system and they are the first thing lost
if you paraphrase them.

Never upgrade vagueness into precision. "Around when Kennedy died" stays
"around when Kennedy died". A memoir built on invented specificity is worthless.

Record nothing you were not told. An empty facts array is a correct answer.`;

  return runJson({
    agent: "listener",
    userId: args.userId,
    bookId: args.bookId,
    model: modelFor("listener"),
    effort: effortFor("listener"),
    system,
    schema: SCHEMA,
    toolName: "file_facts",
    maxTokens: 4_000,
    messages: [
      {
        role: "user",
        content: `Question asked:\n${args.question}\n\nThe author's answer:\n${args.answer}`,
      },
    ],
  });
}
