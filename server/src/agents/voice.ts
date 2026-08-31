/**
 * Shared voice rules and the mechanical backstop behind them.
 *
 * Every agent that writes customer-facing prose (Kyla interviewing, Kyla
 * answering plan questions, Moon writing the plan) carries the same block,
 * so the house voice can't drift between the three of them.
 *
 * The em-dash rule is the one worth explaining. Telling a model "at most
 * one per paragraph" inside a prompt that itself used 240 of them produced
 * a plan with 43. Models mirror the register of their instructions harder
 * than they follow a stated rule about it, so the prompts were rewritten
 * without em-dashes, and sanitizeVoice() catches whatever still slips
 * through. Sanitizing beats a regenerate here: it costs microseconds
 * instead of another minute of planner latency.
 */

/**
 * The character itself, named so no other source file has to contain a
 * literal one. scripts/voice-check.ts scans the codebase for stray
 * em-dashes, and a regex that matches the character is indistinguishable
 * from prose that uses it unless the character lives in exactly one place.
 */
export const EM_DASH = "\u2014";

export const HUMAN_VOICE_RULES = `SOUNDING LIKE A PERSON (this matters as much as the advice)
- NEVER use an em-dash. Not one, anywhere. When you want the pause an em-dash gives you, use a period and start a new sentence, or a comma, or a colon. Em-dash density is the single fastest way to spot machine-written text, and there is no exception for the line you think earns it.
- THE ANTITHESIS CRUTCH, in all its forms: "not X, it's Y", "X isn't A, it's B", "that's a fit problem, not a taste problem", "the senior guy, not the one who booked his room", "not better dressed, just better fitted". Any sentence whose punch comes from a contrast with what it is NOT belongs to this family, and the family is the loudest machine tell there is. ONCE in the whole document, at most. Never in the opening paragraph and never in the sign-off, because those are the most-read lines you write and the shape is most obvious there. Say the positive thing on its own and trust it to land: "That's a shoulder problem" is stronger than "That's a shoulder problem, not a taste problem."
- No triads. Three parallel items with the heaviest last ("real dollar amounts, a timeline, and exactly which stores") is a machine cadence. Use two, or four, or just write the sentence.
- Don't end on a punchy fragment. "That's it." "That's the whole game." "Let's go." Those read as generated flourish. End on the actual last thing you have to say.
- Banned openers: "Here's the deal", "Here's the thing", "Look,", "Listen,", "The truth is", "Let me be blunt".
- Vary sentence construction for real. Some sentences should be plain and unremarkable, because a person doesn't make every line land. Start one with "And" or "But" sometimes. Let one run long and a little messy, then follow it with a short one.
- Concrete nouns over abstractions. "The jacket hangs off your shoulders" beats "the fit undermines your silhouette."
- SOUNDING HUMAN IS NOT PERMISSION TO WRITE MORE. Every word cap in these instructions is a hard ceiling that voice never overrides, and the plainer sentence is almost always the shorter one. If writing a line more naturally made it longer, the rewrite went the wrong way.`;

/**
 * Removes em-dashes from generated prose. An ALL-CAPS lead-in takes a
 * colon ("CONCISION IS A FEATURE: he reads this on a phone"); everything
 * else takes a comma, which is what the dash was standing in for in
 * essentially all of these appositive constructions.
 */
export function sanitizeVoice<T>(value: T): T {
  if (typeof value === "string") {
    return value.replace(new RegExp(`(\\S+)\\s+${EM_DASH}\\s+`, "g"), (_m, before: string) => {
      const bare = before.replace(/["',.:;()]/g, "");
      if (/^[A-Z][A-Z'+&]{2,}$/.test(bare)) return `${before}: `;
      return `${before}, `;
    }) as unknown as T;
  }
  if (Array.isArray(value)) return value.map(sanitizeVoice) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = sanitizeVoice(v);
    return out as unknown as T;
  }
  return value;
}

/**
 * The tells that survive the prompt rules. Em-dashes are handled
 * mechanically above; these three need a rewrite, not a substitution, so
 * they get named precisely enough to hand back to the model.
 *
 * Deliberately scoped to the two fields where the rules are absolute (the
 * opening narrative and Kyla's sign-off) rather than the whole plan. A
 * "buy it in January, not November" in an item tip is a real instruction,
 * not the rhetorical crutch, and firing on it would be noise.
 */
export function findVoiceTells(text: string, opts: { maxSentences?: number } = {}): string[] {
  const tells: string[] = [];
  const t = (text ?? "").trim();
  if (!t) return tells;

  const antithesis = [
    /,\s+not\s+(?:a|an|the|just|some|his|your|their|its|one|because|when|from|to)\b/i,
    /\bisn'?t\s+[^,.;]{2,40},\s*it'?s\b/i,
    /\baren'?t\s+[^,.;]{2,40},\s*(?:they|their)\b/i,
    /\bnot\s+[^,.;]{2,40},\s*(?:just|it'?s)\b/i,
  ].find((re) => re.test(t));
  if (antithesis) {
    tells.push('the "X, not Y" contrast shape, which is banned outright in this field');
  }

  if (/[.!?]\s*(?:That'?s it|That'?s the whole game|Let'?s go|Simple|Done|Period)\.\s*$/i.test(t)) {
    tells.push("a punchy closing fragment instead of a real last sentence");
  }

  if (/^\s*(?:Here'?s the (?:deal|thing)|Look,|Listen,|The truth is|Let me be blunt)/i.test(t)) {
    tells.push("a banned opener");
  }

  const max = opts.maxSentences;
  if (max) {
    const sentences = (t.match(/[^.!?]+[.!?]+/g) ?? [t]).length;
    if (sentences > max) tells.push(`${sentences} sentences against a hard cap of ${max}`);
  }
  return tells;
}
