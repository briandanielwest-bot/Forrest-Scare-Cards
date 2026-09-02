import type { GenreSpec } from "./types";

/**
 * Picture books are a form with hard constraints — page counts come in
 * signatures of eight, the art carries half the story, and the text has to
 * survive being read aloud four hundred times by a tired adult.
 */
export const kids: GenreSpec = {
  key: "kids",
  label: "Kids Picture Book",
  blurb: "A real picture book: 12 to 32 pages, one illustration per spread, built to be read out loud.",
  unit: "spread",
  defaultUnits: 14,
  minUnits: 6,
  maxUnits: 16,
  wordsPerUnit: { low: 12, high: 45 },
  trimSizes: [
    { id: "8.5x8.5", label: '8.5" square — classic picture book', widthIn: 8.5, heightIn: 8.5 },
    { id: "8x10", label: '8" x 10" — portrait', widthIn: 8, heightIn: 10 },
    { id: "10x8", label: '10" x 8" — landscape', widthIn: 10, heightIn: 8 },
  ],
  illustrated: true,
  craft: `
PICTURE BOOK CRAFT RULES

Total word count for the whole book: 300-700 words. A picture book that runs
long is the most common failure and the hardest to fix late. Count as you go.

Every spread must end wanting the page turned. The turn is the punchline, the
reveal, or the held breath. A spread that resolves itself is a dead spread.

Never describe what the picture already shows. If the text says "the dog was
brown and fluffy" the illustrator has nothing left to do. Text and art carry
different halves of the story — that division is the whole art form.

Read every line aloud. If it stumbles, it is wrong. Children's books are heard
before they are read.

If the book rhymes it must rhyme perfectly and scan perfectly, with no inverted
word order to force a rhyme ("the cat, so fat, sat" is a failure). A book with
sloppy meter is worse than a book with no rhyme at all. When in doubt, write
strong rhythmic prose instead and say so.

Age band drives vocabulary: 3-5 needs concrete nouns and one idea per spread;
6-8 tolerates subordinate clauses and a subplot. Never talk down. Children
forgive a hard word; they do not forgive being patronised.

The child in the story solves the problem. Not the parent, not luck.
`.trim(),
  structure: `
Lay the book out in spreads, not pages, and keep the total a multiple that
fits a standard signature: 12, 14 or 16 spreads (24, 28 or 32 printed pages).

Reserve spread 1 for the world and the want, the middle spreads for three
escalating attempts, the penultimate spread for the turn, and the last spread
for the smallest possible resolution. Do not resolve early.

Each spread brief must name: what happens, what the reader sees that the text
does not say, and what makes them turn the page.
`.trim(),
  questions: [
    {
      id: "k_who",
      ask: "Who is this book for, and how old are they?",
      purpose: "Age band sets vocabulary, spread count, and how much subplot the book can carry. Nothing else can be decided without it.",
      depth: "opening",
      probes: ["What do they love right now?", "What are they a little bit afraid of?"],
    },
    {
      id: "k_hero",
      ask: "Tell me about your main character. What do they want more than anything?",
      purpose: "A picture book is a want and an obstacle. This is half of it.",
      depth: "opening",
      probes: ["What are they like when they don't get their way?", "What do they look like?", "Are they a child, an animal, or something else?"],
    },
    {
      id: "k_problem",
      ask: "What's standing in the way?",
      purpose: "The other half. Without a real obstacle the book has no page turns.",
      depth: "opening",
      probes: ["Who or what causes it?", "Why can't they just fix it straight away?"],
    },
    {
      id: "k_tries",
      ask: "What are three things they try that don't work?",
      purpose: "Supplies the escalating middle, which is where most homemade picture books collapse.",
      depth: "middle",
      probes: ["Which one goes worst?", "What does it cost them each time?"],
    },
    {
      id: "k_turn",
      ask: "What finally works, and what does your character have to figure out first?",
      purpose: "Ensures the child solves it, and that the solution is earned rather than granted.",
      depth: "middle",
      probes: ["Do they realise it themselves?", "What do they give up to get it?"],
    },
    {
      id: "k_funny",
      ask: "What's the moment that would make a five-year-old laugh out loud?",
      purpose: "Picture books live and die on one big laugh. Naming it early guarantees it gets a spread.",
      depth: "middle",
      probes: ["Would a grown-up reading it for the fortieth time still smile?"],
    },
    {
      id: "k_feel",
      ask: "How should the child feel on the very last page?",
      purpose: "The emotional landing point, which the ending gets written backwards from.",
      depth: "deep",
      probes: ["Safe, proud, tickled, or brave?", "Is this a bedtime book or a daytime book?"],
    },
    {
      id: "k_look",
      ask: "If you closed your eyes and pictured this book, what does the art look like?",
      purpose: "Seeds the art bible so every spread renders in one consistent style.",
      depth: "deep",
      probes: ["Soft and painty, or bright and bold?", "Is there a book you'd point at and say 'like that'?", "What colours?"],
    },
  ],
};
