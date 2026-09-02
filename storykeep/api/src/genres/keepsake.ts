import type { GenreSpec } from "./types";

/**
 * The small one. A single moment, made permanent — a wedding, a dog, a
 * kitchen, the last summer before someone got sick. Short enough to finish in
 * one or two sittings, which is why it is also the most likely first purchase.
 */
export const keepsake: GenreSpec = {
  key: "keepsake",
  label: "Small Moments Keepsake",
  blurb: "One story, told beautifully. 10 to 40 pages, finished in a sitting or two.",
  unit: "chapter",
  defaultUnits: 6,
  minUnits: 3,
  maxUnits: 14,
  wordsPerUnit: { low: 500, high: 1400 },
  trimSizes: [
    { id: "5.5x8.5", label: '5.5" x 8.5" — gift size', widthIn: 5.5, heightIn: 8.5 },
    { id: "6x9", label: '6" x 9" — standard trade', widthIn: 6, heightIn: 9 },
    { id: "8.5x8.5", label: '8.5" square — photo keepsake', widthIn: 8.5, heightIn: 8.5 },
  ],
  illustrated: true,
  craft: `
KEEPSAKE CRAFT RULES

One moment, held still. This is not a short memoir; it is a single event
examined closely enough that a stranger would care about it.

Stay inside the frame. If the story is the drive home from the hospital, the
book is the drive home from the hospital. Backstory earns its place only when
the moment is unreadable without it, and then in one paragraph, not a chapter.

Slow down at the part that matters. The reader should feel the pace change.

Address the reader as the person it is for. These books are almost always a
gift — for a daughter, for a widow, for someone turning eighty. Write knowing
who opens it.

Small and true beats large and grand. The detail of the chipped mug is worth
more than any sentence containing the word "journey".

Length is a promise. If it wants to be eleven pages, it is eleven pages, and it
is finished. Padding a keepsake is the one unforgivable failure here.
`.trim(),
  structure: `
Build it as a handful of short movements rather than chapters: the approach,
the moment, the thing nobody noticed at the time, and what it means now that
time has passed.

Open in the middle of the moment. Give the reader a place to stand within two
sentences.

If the author has said who the book is for, reserve the final short section as
a direct address to that person, unless they've asked otherwise.
`.trim(),
  questions: [
    {
      id: "s_moment",
      ask: "What's the moment? Tell it to me the way you'd tell a friend, start to finish.",
      purpose: "Gets the whole shape in one uninterrupted telling before any probing narrows it.",
      depth: "opening",
      probes: ["Where does it actually start?", "How long did the whole thing take?"],
    },
    {
      id: "s_for",
      ask: "Who is this book for?",
      purpose: "Almost every keepsake is a gift. Knowing the recipient changes the voice, the ending, and the dedication.",
      depth: "opening",
      probes: ["What do you want them to understand?", "Will you be there when they read it?"],
    },
    {
      id: "s_see",
      ask: "Close your eyes. What do you see first?",
      purpose: "Produces the opening image, which is what the entire book gets built outward from.",
      depth: "opening",
      probes: ["What's the light like?", "What can you smell?"],
    },
    {
      id: "s_said",
      ask: "What was said? Give me the actual words if you have them.",
      purpose: "Real dialogue is the single most valuable thing a keepsake can preserve and it fades fastest.",
      depth: "middle",
      probes: ["Who spoke first?", "What did you say back?", "What do you wish you'd said?"],
    },
    {
      id: "s_missed",
      ask: "What did nobody notice at the time that you notice now?",
      purpose: "This is the hinge of the form — the retrospect that turns an anecdote into a book.",
      depth: "deep",
      probes: ["When did you first see it?", "Does anyone else know?"],
    },
    {
      id: "s_keep",
      ask: "Is there an object from that day? Where is it now?",
      purpose: "A physical object anchors the ending and gives the illustrator something real to draw.",
      depth: "deep",
      probes: ["Can you describe it exactly?", "Who gets it next?"],
    },
    {
      id: "s_now",
      ask: "What do you carry from it, today, without thinking about it?",
      purpose: "The closing note. Keepsakes end in the present tense or they end nowhere.",
      depth: "deep",
      probes: ["When does it come back to you?", "Has it changed as you got older?"],
    },
  ],
};
