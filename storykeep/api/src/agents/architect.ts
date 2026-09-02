import { arrayOf, objectSchema, runJson, str } from "../lib/claude";
import { agentHeader } from "./context";
import { effortFor, modelFor } from "./roster";
import type { GenreSpec } from "../genres";
import { AGENTS } from "./roster";

export interface OutlineUnit {
  title: string;
  brief: string;
}

export interface Outline {
  shape: string;
  bookTitle: string;
  subtitle: string;
  units: OutlineUnit[];
}

const SCHEMA = objectSchema(
  {
    shape: str("One paragraph explaining the structure you chose and why it fits this particular material."),
    bookTitle: str("A title drawn from the author's own words or world. Never a generic one."),
    subtitle: str("A subtitle, or empty string if the book is better without one."),
    units: arrayOf(
      objectSchema(
        {
          title: str("The chapter or spread title."),
          brief: str(
            "What this unit does: whose it is, what changes in it, what the reader must know by the end, and which ledger entries it draws on. Written for the writer, not the reader.",
          ),
        },
        ["title", "brief"],
      ),
      "The units in reading order.",
    ),
  },
  ["shape", "bookTitle", "subtitle", "units"],
);

/**
 * Atlas.
 *
 * Runs once the opening interview has produced enough ledger to see the shape,
 * and can be re-run when the material has grown enough to invalidate the plan.
 * Runs at high effort because a bad outline costs every downstream agent.
 */
export async function buildOutline(args: {
  bookId: string;
  userId: string;
  bible: string;
  genre: GenreSpec;
  targetUnits: number;
  transcriptDigest: string;
}): Promise<Outline> {
  const { genre, targetUnits } = args;
  const system = `${agentHeader("architect")}

${args.bible}

---

${genre.structure}

---

HOW YOU WORK

Aim for ${targetUnits} ${genre.unit}s. You may come within two either side if the
material genuinely demands it; say so in the shape paragraph if you do.

Build only from what is in the story ledger. An outline containing a chapter
the author has not given you material for is a promise the Ghostwriter cannot
keep, and it is how these books end up padded.

Where you can see a gap that matters — a chapter that should exist but has no
material — still include it, and write the brief as an explicit request for
what the interview must supply. ${AGENTS.interviewer.name} will go and get it.

Titles come from the book's own world: a place, an object, a line someone said.
Never "Early Years", "New Beginnings", "The Journey Continues", or any title
that would fit somebody else's life equally well.

A brief is a working document. Be blunt in it. "This is the chapter where he
admits he was wrong about his father, and he has not yet said so out loud —
the interview needs to get there before this can be written."`;

  return runJson<Outline>({
    agent: "architect",
    userId: args.userId,
    bookId: args.bookId,
    model: modelFor("architect"),
    effort: effortFor("architect"),
    system,
    schema: SCHEMA,
    toolName: "outline",
    maxTokens: 16_000,
    messages: [
      {
        role: "user",
        content: `Here is a digest of everything the author has told us so far:\n\n${args.transcriptDigest}\n\nBuild the outline.`,
      },
    ],
  });
}
