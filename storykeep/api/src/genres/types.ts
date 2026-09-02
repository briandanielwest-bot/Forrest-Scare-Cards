export type GenreKey = "memoir" | "kids" | "keepsake";
export type AssistLevel = "ghostwriter" | "cowriter" | "coach";

/** A prompt in the bank. `depth` is how far in an interview it belongs. */
export interface BankQuestion {
  id: string;
  /** The question as a human would ask it, out loud. */
  ask: string;
  /** Why it's here — the Interviewer uses this to decide when it's worth asking. */
  purpose: string;
  depth: "opening" | "middle" | "deep";
  /** Follow-ups the Interviewer can reach for when the answer is thin. */
  probes: string[];
}

export interface GenreSpec {
  key: GenreKey;
  label: string;
  blurb: string;
  /** Chapters for prose books, spreads for illustrated ones. */
  unit: "chapter" | "spread";
  /** Typical finished length, used to size the outline and quote a page count. */
  defaultUnits: number;
  minUnits: number;
  maxUnits: number;
  wordsPerUnit: { low: number; high: number };
  trimSizes: { id: string; label: string; widthIn: number; heightIn: number }[];
  illustrated: boolean;
  /** Craft rules injected into every writing agent for this genre. */
  craft: string;
  /** How the Architect is told to shape the book. */
  structure: string;
  questions: BankQuestion[];
}
