import type { GenreSpec } from "./types";

/**
 * The flagship. Everything here is tuned for one situation: a person with a
 * life worth recording who will talk for an hour but will not type for one.
 */
export const memoir: GenreSpec = {
  key: "memoir",
  label: "Biography / Memoir",
  blurb: "Your life, or someone else's, told properly. Scales from 60 pages to 400.",
  unit: "chapter",
  defaultUnits: 14,
  minUnits: 4,
  maxUnits: 60,
  wordsPerUnit: { low: 1800, high: 4200 },
  trimSizes: [
    { id: "6x9", label: '6" x 9" — standard trade', widthIn: 6, heightIn: 9 },
    { id: "5.5x8.5", label: '5.5" x 8.5" — digest', widthIn: 5.5, heightIn: 8.5 },
    { id: "8.5x11", label: '8.5" x 11" — large print / photo pages', widthIn: 8.5, heightIn: 11 },
  ],
  illustrated: false,
  craft: `
MEMOIR CRAFT RULES

Scene over summary. "My father was a hard man" is a claim; the morning he made
you re-stack the woodpile in the rain is the book. When the ledger gives you a
scene, write the scene. When it only gives you a claim, write toward the claim
and mark what you'd need to make it a scene.

Concrete nouns. The make of the car, the brand on the tin, the name of the
street. Specificity is the entire difference between a memoir and an obituary.

Keep the author's idiom. If they say "we didn't have two nickels to rub
together," that sentence goes in the book in their words. Do not upgrade a
plain speaker into a literary one. Do not add lyricism they did not supply.

No invented facts, ever. If a detail is needed and absent, either write around
it or leave a bracketed [ASK: what colour was the truck?] for the interview to
resolve. Inventing a plausible detail in a memoir is not a style choice, it is
a falsehood about a real person's life.

Time is allowed to move. You may compress twelve years into a paragraph, but
tell the reader you did.

Earned sentiment only. The reader cries because of what happened, never because
the prose told them to. Cut every sentence that instructs the reader how to feel.
`.trim(),
  structure: `
Shape a life into chapters that each carry one turn — a decision, a loss, an
arrival, a reckoning. Chronological is the default because it is what readers
of memoir expect and what an elderly narrator finds easiest to follow, but
propose a thematic structure instead when the material clusters by subject
(the houses, the jobs, the illnesses) rather than by decade.

Open at a moment of change, not at birth. Birth can be chapter two.

Every chapter brief must name: whose chapter it is, what changes in it, what
the reader must know by the end, and which ledger entries it draws on.
`.trim(),
  questions: [
    {
      id: "m_open_room",
      ask: "Take me to one room you can still see perfectly. Where are we, and what's in it?",
      purpose: "Opens with sensory recall rather than biography, which loosens people up and yields usable scene detail immediately.",
      depth: "opening",
      probes: ["What can you hear from that room?", "Who else is in the house right now?", "What time of day is it?"],
    },
    {
      id: "m_open_who",
      ask: "If someone read this book and only remembered one thing about you, what should it be?",
      purpose: "Establishes the spine of the book in the author's own words. Everything later gets measured against this.",
      depth: "opening",
      probes: ["Why that one?", "Would the people who know you best agree?"],
    },
    {
      id: "m_people",
      ask: "Who are the five people this story can't be told without?",
      purpose: "Seeds the ledger's cast before any chapter is drafted.",
      depth: "opening",
      probes: ["Tell me how you'd describe each one to a stranger in one sentence.", "Which of them is still living?"],
    },
    {
      id: "m_turn",
      ask: "What's the decision you made that changed the direction of everything after it?",
      purpose: "Finds the book's central turn, which usually becomes the structural midpoint.",
      depth: "middle",
      probes: ["What would have happened if you'd chosen the other way?", "Who tried to talk you out of it?", "How old were you?"],
    },
    {
      id: "m_hard",
      ask: "What's the hardest year, and what made it hard?",
      purpose: "Memoirs without difficulty read as brochures. This is usually where the real book is.",
      depth: "deep",
      probes: ["What got you through it?", "What did you stop believing that year?", "Who showed up, and who didn't?"],
    },
    {
      id: "m_work",
      ask: "Walk me through an ordinary working day back then, hour by hour.",
      purpose: "Ordinary routine is the richest source of period detail and it is the thing families most want preserved.",
      depth: "middle",
      probes: ["What did you eat?", "What did it pay?", "What did your hands look like at the end of it?"],
    },
    {
      id: "m_money",
      ask: "What was money like in your house growing up?",
      purpose: "Class and money shape everything and are rarely volunteered without being asked directly.",
      depth: "middle",
      probes: ["What couldn't you have that other kids had?", "When did that change?"],
    },
    {
      id: "m_love",
      ask: "Tell me about meeting the person who mattered most.",
      purpose: "Reliably produces a full scene with dialogue, which is the best possible raw material.",
      depth: "middle",
      probes: ["What were they wearing?", "What did you think in the first ten seconds?", "When did you know?"],
    },
    {
      id: "m_wrong",
      ask: "What's something you got wrong that you'd like to put on the record properly?",
      purpose: "Self-implication is what separates a memoir from a legacy pamphlet, and readers trust a narrator who admits things.",
      depth: "deep",
      probes: ["Did you ever make it right?", "What would you say to that version of yourself?"],
    },
    {
      id: "m_lost",
      ask: "Who did you lose, and what do you still do because of them?",
      purpose: "Grief carried into habit is the single most affecting material a memoir can hold.",
      depth: "deep",
      probes: ["When do you think about them?", "What would they make of this book?"],
    },
    {
      id: "m_change",
      ask: "What's changed in the world since then that you don't think people understand?",
      purpose: "Turns the narrator into a witness, which gives the book value beyond the family.",
      depth: "deep",
      probes: ["What did we lose when that changed?", "What are people right about now that you were wrong about then?"],
    },
    {
      id: "m_close",
      ask: "What do you want the last page to leave people with?",
      purpose: "The ending is a decision, not an accident. Getting it early lets every chapter aim at it.",
      depth: "deep",
      probes: ["Is that a comfort or a warning?", "Who is that last page for?"],
    },
  ],
};
