import { DEEPGRAM_API_KEY } from "../config";

export interface Transcript {
  text: string;
  seconds: number;
  provider: "deepgram" | "browser";
}

/**
 * Voice is the whole point of this product, so it degrades rather than fails.
 *
 * With a Deepgram key, uploaded audio is transcribed server-side: better with
 * accents, better with an eighty-year-old's voice, works in every browser.
 * Without one, the browser's own speech recognition has already produced a
 * transcript on the client and we use that. The author never sees the
 * difference except in accuracy, and the app costs nothing extra to run until
 * you decide it should.
 */
export async function transcribe(audio: Buffer, mimeType: string): Promise<Transcript> {
  if (!DEEPGRAM_API_KEY) {
    throw new NoTranscriptionProvider();
  }

  const params = new URLSearchParams({
    model: "nova-3",
    smart_format: "true",
    punctuate: "true",
    // People telling life stories pause. A short endpointing window chops a
    // sentence in half mid-memory, which is the most disheartening possible
    // failure for someone who found it hard to start talking.
    utterances: "true",
    filler_words: "false",
  });

  const response = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: { Authorization: `Token ${DEEPGRAM_API_KEY}`, "Content-Type": mimeType },
    body: new Uint8Array(audio),
  });

  if (!response.ok) {
    throw new Error(`Transcription failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as {
    metadata?: { duration?: number };
    results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
  };

  const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
  return { text, seconds: data.metadata?.duration ?? 0, provider: "deepgram" };
}

export class NoTranscriptionProvider extends Error {
  constructor() {
    super("No server-side transcription configured; using the browser transcript.");
    this.name = "NoTranscriptionProvider";
  }
}
