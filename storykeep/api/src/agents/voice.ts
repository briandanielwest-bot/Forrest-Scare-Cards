import { arrayOf, objectSchema, runJson, str } from "../lib/claude";
import { agentHeader } from "./context";
import { effortFor, modelFor } from "./roster";
import type { VoiceProfile } from "../types";

const SCHEMA = objectSchema(
  {
    summary: str("Three or four sentences describing how this person talks, as you would brief a ghostwriter."),
    signature: arrayOf(str("A word or phrase this person genuinely uses."), "Six to twelve items, drawn from the transcript verbatim."),
    forbidden: arrayOf(
      str("A word or construction that would sound false in this person's mouth."),
      "Eight to fifteen items. Include the specific literary reflexes an AI would reach for that this person plainly would not.",
    ),
    sentenceRhythm: str("How their sentences run — length, whether they trail off, whether they self-interrupt."),
    formality: str("Register: how formal, how much slang, whether they swear, whether they hedge."),
    humour: str("What they find funny and how it shows up. 'None' is a valid answer."),
    exemplar: str("The single line from the transcript that sounds most like them. Verbatim, unedited."),
  },
  ["summary", "signature", "forbidden", "sentenceRhythm", "formality", "humour", "exemplar"],
);

/**
 * Mirror.
 *
 * The difference between a ghostwritten book and a generated one. Runs once
 * there is enough transcript to be worth reading, then again as the transcript
 * grows. Its output rides in the cached prefix of every writing call.
 */
export async function buildVoiceProfile(args: {
  bookId: string;
  userId: string;
  transcript: string;
}): Promise<VoiceProfile> {
  const system = `${agentHeader("voice")}

WHAT YOU DO

You are given raw transcript of a person answering questions out loud. You
produce a fingerprint precise enough that another writer could forge them.

Work from evidence in the transcript, never from a stereotype. If they are a
retired welder from Ohio, that tells you nothing — the transcript tells you
everything.

The forbidden list is the most valuable field and the one most people get
wrong. It is not a list of bad writing. It is the list of moves a competent
literary ghostwriter would reflexively make that would make THIS person sound
like someone else. If they never use a semicolon, say so. If they say "kids"
and never "children", put "children" on the list. If they are plain-spoken,
forbid every ornamental verb they didn't use.

Take the exemplar verbatim, including the false start if there is one. Do not
tidy it. The stumble is the fingerprint.

Speech is not writing: ignore filler ("um", repeated words) when judging
rhythm, but do not mistake a plain speaker for an inarticulate one.`;

  return runJson<VoiceProfile>({
    agent: "voice",
    userId: args.userId,
    bookId: args.bookId,
    model: modelFor("voice"),
    effort: effortFor("voice"),
    system,
    schema: SCHEMA,
    toolName: "fingerprint",
    maxTokens: 4_000,
    messages: [{ role: "user", content: `Transcript:\n\n${args.transcript}` }],
  });
}
