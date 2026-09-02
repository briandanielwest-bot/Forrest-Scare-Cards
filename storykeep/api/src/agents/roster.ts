import { CRAFT_MODEL, UTILITY_MODEL } from "../config";
import type { Effort } from "../lib/claude";

/**
 * The crew.
 *
 * Fifteen agents plus an orchestrator that routes between them. They split
 * along one line: the CRAFT agents make prose and structural judgements and
 * run on the most capable model, the UTILITY agents do structured reads —
 * extraction, diffing, counting, grading — where a faster model is
 * indistinguishable and costs a third as much.
 *
 * The personas are original characters. They exist because a person being
 * interviewed about their dead mother answers a named interviewer very
 * differently than they answer "the system", and because a note that says
 * "Ledger flagged a date conflict" reads as help while "ERROR: continuity"
 * reads as failure.
 */
export interface AgentSpec {
  key: string;
  /** The name the author sees. */
  name: string;
  role: string;
  /** One line, shown in the app when this agent is working. */
  blurb: string;
  tier: "craft" | "utility";
  effort: Effort;
}

export const AGENTS = {
  interviewer: {
    key: "interviewer",
    name: "Wren",
    role: "The Interviewer",
    blurb: "Asks the questions. Knows when to follow a tangent and when to bring you back.",
    tier: "craft",
    effort: "high",
  },
  listener: {
    key: "listener",
    name: "Echo",
    role: "The Listener",
    blurb: "Pulls every name, date, place and object out of what you said and files it.",
    tier: "utility",
    effort: "medium",
  },
  architect: {
    key: "architect",
    name: "Atlas",
    role: "The Architect",
    blurb: "Decides what the book is shaped like and what belongs in each chapter.",
    tier: "craft",
    effort: "xhigh",
  },
  ghostwriter: {
    key: "ghostwriter",
    name: "Quill",
    role: "The Ghostwriter",
    blurb: "Turns what you said into pages that sound like you said them well.",
    tier: "craft",
    effort: "xhigh",
  },
  voice: {
    key: "voice",
    name: "Mirror",
    role: "The Voice Matcher",
    blurb: "Builds a fingerprint of how you actually talk, and holds every page to it.",
    tier: "craft",
    effort: "high",
  },
  continuity: {
    key: "continuity",
    name: "Ledger",
    role: "The Continuity Keeper",
    blurb: "Catches the brother who was 12 in one chapter and 9 in the next.",
    tier: "utility",
    effort: "medium",
  },
  editor: {
    key: "editor",
    name: "Marla",
    role: "The Editor",
    blurb: "Line by line. Cuts the padding, fixes the rhythm, leaves the meaning alone.",
    tier: "craft",
    effort: "high",
  },
  originality: {
    key: "originality",
    name: "Sable",
    role: "The Originality Guard",
    blurb: "Makes sure this book doesn't sound like every other book the machine has written.",
    tier: "utility",
    effort: "medium",
  },
  sensitivity: {
    key: "sensitivity",
    name: "Iris",
    role: "The Careful Reader",
    blurb: "Flags what's about a living person, what's private, and what you may want to soften.",
    tier: "craft",
    effort: "high",
  },
  reader: {
    key: "reader",
    name: "Pip",
    role: "The Reader Advocate",
    blurb: "Reads it cold, like a stranger would, and says where it drags.",
    tier: "craft",
    effort: "medium",
  },
  memoirist: {
    key: "memoirist",
    name: "Hollis",
    role: "Memoir Specialist",
    blurb: "Knows how a life becomes a book without becoming a list.",
    tier: "craft",
    effort: "high",
  },
  picturebook: {
    key: "picturebook",
    name: "Bea",
    role: "Picture Book Specialist",
    blurb: "Page turns, word counts, meter, and what a four-year-old will sit still for.",
    tier: "craft",
    effort: "high",
  },
  keepsaker: {
    key: "keepsaker",
    name: "June",
    role: "Keepsake Specialist",
    blurb: "Takes one small moment and makes it hold its weight.",
    tier: "craft",
    effort: "high",
  },
  illustrator: {
    key: "illustrator",
    name: "Ink",
    role: "The Illustration Director",
    blurb: "Keeps the same child looking like the same child on every page.",
    tier: "craft",
    effort: "high",
  },
  typesetter: {
    key: "typesetter",
    name: "Cass",
    role: "The Typesetter",
    blurb: "Margins, trim, front matter, page numbers. Makes the file a printer will accept.",
    tier: "utility",
    effort: "low",
  },
} as const satisfies Record<string, AgentSpec>;

export type AgentKey = keyof typeof AGENTS;

export const AGENT_LIST: AgentSpec[] = Object.values(AGENTS);

export function modelFor(key: AgentKey): string {
  return AGENTS[key].tier === "craft" ? CRAFT_MODEL : UTILITY_MODEL;
}

export function effortFor(key: AgentKey): Effort {
  return AGENTS[key].effort;
}

/** The genre specialist whose craft rules ride along with every writing call. */
export function specialistFor(genre: string): AgentKey {
  if (genre === "kids") return "picturebook";
  if (genre === "keepsake") return "keepsaker";
  return "memoirist";
}
