import { GENRES, type GenreSpec } from "../genres";
import { AGENTS, type AgentKey } from "./roster";
import type { BookRow, LedgerRow, VoiceProfile } from "../types";
import { BRAND } from "../brand";

/**
 * The book bible — the block of context every writing agent carries.
 *
 * This is deliberately assembled in a fixed order with nothing volatile in
 * it: no timestamps, no request ids, no "as of today". It is sent as the
 * cached system prefix, and a single changing byte anywhere in it would
 * invalidate the cache for every later call on the same book. That would
 * roughly triple the API cost of a memoir, silently.
 */
export function bookBible(args: {
  book: BookRow;
  genre: GenreSpec;
  ledger: LedgerRow[];
  voice: VoiceProfile | null;
}): string {
  const { book, genre, ledger, voice } = args;
  const parts: string[] = [];

  parts.push(`THE BOOK
Title: ${book.title}${book.subtitle ? ` — ${book.subtitle}` : ""}
Form: ${genre.label}
Assistance level: ${assistDescription(book.assist_level)}
${book.blueprint.audience ? `Audience: ${book.blueprint.audience}` : ""}
${book.blueprint.brief ? `What the author told us up front: ${book.blueprint.brief}` : ""}
${book.blueprint.shape ? `Agreed shape: ${book.blueprint.shape}` : ""}`.trim());

  parts.push(genre.craft);

  if (voice) parts.push(voiceBlock(voice));

  if (ledger.length) parts.push(ledgerBlock(ledger));

  parts.push(originalityBlock(book.style_seed));

  return parts.join("\n\n---\n\n");
}

function assistDescription(level: string): string {
  switch (level) {
    case "coach":
      return `COACH. The author writes. You do not write prose for the book, ever — not a
sentence, not a repair. You ask, you point out what isn't working, you suggest
directions. If asked to draft, decline and offer three angles instead.`;
    case "cowriter":
      return `CO-WRITER. You draft; the author rewrites; you polish what they changed
without flattening it. When the author has edited a passage, treat their
wording as correct and work around it. Never silently revert their choices.`;
    default:
      return `GHOSTWRITER. You write the book. The author talks and approves. Give them
finished pages, not scaffolding, and never ask them to do the writing.`;
  }
}

function voiceBlock(voice: VoiceProfile): string {
  return `THE AUTHOR'S VOICE — match it, do not improve it

${voice.summary}

Rhythm: ${voice.sentenceRhythm}
Register: ${voice.formality}
Humour: ${voice.humour}

Phrases they genuinely use: ${voice.signature.join(", ")}
Words they would never say — do not use these: ${voice.forbidden.join(", ")}

A line in their own words, for calibration:
"${voice.exemplar}"

If a sentence you have written would sound wrong in this person's mouth, it is
wrong, however well made it is.`;
}

function ledgerBlock(ledger: LedgerRow[]): string {
  const byKind = new Map<string, LedgerRow[]>();
  // Sorted, so the block is byte-identical between calls when nothing changed.
  for (const row of [...ledger].sort((a, b) => a.id.localeCompare(b.id))) {
    const list = byKind.get(row.kind) ?? [];
    list.push(row);
    byKind.set(row.kind, list);
  }
  const sections = [...byKind.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, rows]) => {
      const lines = rows.map((r) => {
        const when = r.when_text ? ` (${r.when_text})` : "";
        const detail = r.detail ? ` — ${r.detail}` : "";
        return `- ${r.label}${when}${detail}`;
      });
      return `${kind.toUpperCase()}\n${lines.join("\n")}`;
    });

  return `THE STORY LEDGER — everything established so far

These are facts the author gave us. They are the only facts you may treat as
true. Anything not here, you do not know: write around it, or leave a bracketed
[ASK: ...] note. Never invent a detail to fill a gap.

${sections.join("\n\n")}`;
}

/**
 * The uniqueness mechanism.
 *
 * Every book gets a style seed at creation that never changes. It is not
 * decoration — it is the instruction that stops the fourteenth memoir the
 * system writes from opening the same way as the first thirteen, which is the
 * single most likely way a product like this dies.
 */
function originalityBlock(seed: string): string {
  return `THIS BOOK'S SIGNATURE — ${seed}

Hold to this book's own texture. Concretely, that means:

Never open a chapter with weather, a date, or a character waking up.
Never use these constructions anywhere: "little did I know", "little did they
know", "it was then that I realised", "as it turned out", "in that moment",
"a testament to", "the tapestry of", "chapter of my life", "journey" as a
metaphor for a life, "unbeknownst to", "sent shivers", "heart swelled",
"couldn't help but", "I would come to learn".
Never end a chapter on a rhetorical question or a one-line aphorism.
Never begin consecutive paragraphs with the same word.

Two sentences in a row that could have appeared verbatim in any other book of
this kind is a defect. Rewrite them.`;
}

export function agentHeader(key: AgentKey): string {
  const a = AGENTS[key];
  return `You are ${a.name}, ${a.role} at ${BRAND.name}. ${a.blurb}`;
}

export function genreSpec(key: string): GenreSpec {
  return GENRES[key as keyof typeof GENRES] ?? GENRES.memoir;
}
