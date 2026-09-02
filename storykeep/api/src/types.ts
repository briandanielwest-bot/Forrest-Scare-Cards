import type { AssistLevel, GenreKey } from "./genres";

export interface BookRow {
  id: string;
  user_id: string;
  genre: GenreKey;
  title: string;
  subtitle: string | null;
  assist_level: AssistLevel;
  style_seed: string;
  target_pages: number | null;
  blueprint: Blueprint;
  voice_profile: VoiceProfile | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface Blueprint {
  /** How the Architect decided to shape it, in one paragraph. */
  shape?: string;
  units?: number;
  trim?: string;
  /** Free-form things the author told us up front (who it's for, age band). */
  brief?: string;
  audience?: string;
  outlineLocked?: boolean;
}

/**
 * How this person actually talks. Built by Mirror from the raw transcript,
 * then carried in the cached prefix of every writing call.
 */
export interface VoiceProfile {
  summary: string;
  /** Words and phrases this person genuinely uses. */
  signature: string[];
  /** Words they would never use — the ones a generic AI would reach for. */
  forbidden: string[];
  sentenceRhythm: string;
  formality: string;
  humour: string;
  /** A verbatim line from the transcript that sounds most like them. */
  exemplar: string;
}

export interface ChapterRow {
  id: string;
  book_id: string;
  position: number;
  title: string;
  brief: string | null;
  status: string;
  current_draft_id: string | null;
}

export interface TurnRow {
  id: string;
  interview_id: string;
  book_id: string;
  role: "agent" | "author";
  text: string;
  source: "text" | "voice";
  raw_transcript: string | null;
  created_at: Date;
}

export interface LedgerRow {
  id: string;
  book_id: string;
  kind: string;
  label: string;
  detail: string | null;
  when_text: string | null;
  confidence: number;
}

export interface SpreadRow {
  id: string;
  book_id: string;
  position: number;
  text: string;
  art_brief: string | null;
  image_url: string | null;
  image_status: string;
}

export interface ReviewNote {
  agent: string;
  severity: "note" | "warn" | "block";
  message: string;
  detail?: unknown;
}
