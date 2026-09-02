import { arrayOf, objectSchema, runJson, str } from "../lib/claude";
import { agentHeader } from "./context";
import { effortFor, modelFor } from "./roster";

export interface ArtBible {
  style: string;
  palette: string;
  characters: { name: string; sheet: string }[];
}

export interface SpreadArt {
  position: number;
  brief: string;
  prompt: string;
}

const BIBLE_SCHEMA = objectSchema(
  {
    style: str(
      "The rendering style in one dense sentence a renderer can act on: medium, line quality, texture, light. No artist names.",
    ),
    palette: str("Six to nine named colours with their role. 'Warm ochre grounds; muted teal for night; one hot coral for the dog.'"),
    characters: arrayOf(
      objectSchema(
        {
          name: str("Who this is."),
          sheet: str(
            "A character sheet precise enough that two separate renders produce the same individual: build, hair, face, exact clothing that never changes, one unmistakable identifying feature.",
          ),
        },
        ["name", "sheet"],
      ),
      "Every recurring character, including animals.",
    ),
  },
  ["style", "palette", "characters"],
);

const SPREADS_SCHEMA = objectSchema(
  {
    spreads: arrayOf(
      objectSchema(
        {
          brief: str("Plain-language art direction the author can read and approve, or hand to a human illustrator."),
          prompt: str(
            "The render prompt. Restate the style and the full character sheet for anyone in frame — a renderer has no memory of the previous page.",
          ),
        },
        ["brief", "prompt"],
      ),
      "One entry per spread, in order.",
    ),
  },
  ["spreads"],
);

/**
 * Ink.
 *
 * Consistency is the entire job. A picture book where the child's hair changes
 * colour between spreads is not a picture book, and image models have no
 * memory between calls — so every prompt has to carry the whole character
 * sheet with it.
 */
export async function buildArtBible(args: {
  bookId: string;
  userId: string;
  bible: string;
  styleWish: string;
  storyText: string;
}): Promise<ArtBible> {
  const system = `${agentHeader("illustrator")}

${args.bible}

---

You are writing the style bible for this book's art. Everything downstream
copies from it verbatim, so it must be specific enough to survive being pasted
into a renderer that has never seen the previous page.

Name no living artist and no studio. Describe the qualities instead — the
weight of the line, whether edges are soft, how light falls, what the paper
looks like. A style you can only reach by naming someone else's is not this
book's style.

A character sheet must fix the things that must not drift: hair colour and
shape, skin tone, build, age, and one item of clothing that never changes and
makes them instantly identifiable at any size.

Take the author's own wish for the look seriously and build from it. It is
their book.`;

  return runJson<ArtBible>({
    agent: "illustrator",
    userId: args.userId,
    bookId: args.bookId,
    model: modelFor("illustrator"),
    effort: effortFor("illustrator"),
    system,
    schema: BIBLE_SCHEMA,
    toolName: "art_bible",
    maxTokens: 6_000,
    messages: [
      {
        role: "user",
        content: `What the author said they want it to look like:\n${args.styleWish || "(they didn't say — choose something that fits the story)"}\n\nThe story:\n\n${args.storyText}`,
      },
    ],
  });
}

export async function briefSpreads(args: {
  bookId: string;
  userId: string;
  bible: string;
  artBible: ArtBible;
  spreadTexts: string[];
}): Promise<SpreadArt[]> {
  const system = `${agentHeader("illustrator")}

${args.bible}

---

THE STYLE BIBLE FOR THIS BOOK — every prompt must restate it

Style: ${args.artBible.style}
Palette: ${args.artBible.palette}

Characters:
${args.artBible.characters.map((c) => `${c.name}: ${c.sheet}`).join("\n")}

---

For each spread, direct one image.

Show what the words do not say. If the text says the boy was brave, the picture
shows what he did. If the text and the picture say the same thing, the spread
is wasted.

Compose for a real book: leave a clear area where the text will sit, and never
put anything important in the centre gutter.

Every prompt restates the style sentence, the palette, and the complete
character sheet for anyone in frame. The renderer has no memory. Assume it
knows nothing about the previous page — because it doesn't.

No text, letters, numbers, or speech bubbles in the image. The words are set in
type, not drawn.`;

  const result = await runJson<{ spreads: { brief: string; prompt: string }[] }>({
    agent: "illustrator",
    userId: args.userId,
    bookId: args.bookId,
    model: modelFor("illustrator"),
    effort: effortFor("illustrator"),
    system,
    schema: SPREADS_SCHEMA,
    toolName: "direct",
    maxTokens: 16_000,
    messages: [
      {
        role: "user",
        content: args.spreadTexts
          .map((t, i) => `Spread ${i + 1}:\n${t || "(no words on this spread)"}`)
          .join("\n\n"),
      },
    ],
  });

  return result.spreads.map((s, i) => ({ position: i, brief: s.brief, prompt: s.prompt }));
}
