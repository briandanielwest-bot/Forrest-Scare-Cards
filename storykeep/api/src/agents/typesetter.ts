import { arrayOf, objectSchema, runJson, str } from "../lib/claude";
import { agentHeader } from "./context";
import { effortFor, modelFor } from "./roster";

export interface FrontMatter {
  titlePage: { title: string; subtitle: string; byline: string };
  dedication: string;
  epigraph: string;
  authorNote: string;
  backCover: string;
}

const SCHEMA = objectSchema(
  {
    title: str("The title as it should appear on the title page."),
    subtitle: str("Subtitle, or empty string."),
    byline: str("How the author should be credited. 'As told by Ruth Callan' is often righter than 'by'."),
    dedication: str(
      "The dedication, in the author's own voice. Use what they said about who the book is for. Empty string if they gave nothing to work with — never invent a dedication.",
    ),
    epigraph: str("A line quoted from the author's own transcript that opens the book well, or empty string."),
    authorNote: str("A short note at the front explaining how the book came to be made, in the author's voice. Three sentences at most."),
    backCover: str("Back cover copy. 120 words maximum. No hype, no 'unforgettable', no 'poignant'."),
  },
  ["title", "subtitle", "byline", "dedication", "epigraph", "authorNote", "backCover"],
);

/**
 * Cass.
 *
 * The unglamorous agent that decides the book is a book. Runs at low effort —
 * this is assembly, not judgement — but it is the difference between a PDF and
 * something a printer will accept.
 */
export async function buildFrontMatter(args: {
  bookId: string;
  userId: string;
  bible: string;
  authorName: string;
  digest: string;
}): Promise<FrontMatter> {
  const system = `${agentHeader("typesetter")}

${args.bible}

---

You are assembling the front and back matter. Use only the author's own
material and their own voice.

Never invent a dedication. If they never said who the book is for, return an
empty string and the page is simply omitted — a fabricated dedication to a
person who does not exist is the worst possible thing to print in a memoir.

The epigraph, if you use one, is a line the author actually said, quoted
verbatim from the transcript and attributed to them.

Back cover copy describes; it does not sell. No adjectives that a stranger
could not verify from the book itself.`;

  const raw = await runJson<{
    title: string;
    subtitle: string;
    byline: string;
    dedication: string;
    epigraph: string;
    authorNote: string;
    backCover: string;
  }>({
    agent: "typesetter",
    userId: args.userId,
    bookId: args.bookId,
    model: modelFor("typesetter"),
    effort: effortFor("typesetter"),
    system,
    schema: SCHEMA,
    toolName: "front_matter",
    maxTokens: 4_000,
    messages: [
      { role: "user", content: `Author's name: ${args.authorName}\n\nThe book so far:\n\n${args.digest}` },
    ],
  });

  return {
    titlePage: { title: raw.title, subtitle: raw.subtitle, byline: raw.byline },
    dedication: raw.dedication,
    epigraph: raw.epigraph,
    authorNote: raw.authorNote,
    backCover: raw.backCover,
  };
}
