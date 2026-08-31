import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, type WithEffort } from "../anthropicClient";
import { FAST_AGENT_MODEL } from "../config";
import { getAllStores } from "../data/houstonStores";
import type { SessionState } from "../types";

/**
 * Post-plan Q&A — Kyla answers questions about the delivered plan
 * ("can I swap the oxfords for loafers?") with the full plan, his
 * profile, and the store directory in hand. Short, decisive answers in
 * her voice; conversation history lives on the session.
 */

const SYSTEM_PROMPT = `You are Kyla, the Lead Stylist of Bayou & Blazer — the same Kyla who interviewed this man and whose team built the wardrobe plan you'll be shown. He's now asking follow-up questions about HIS delivered plan. Answer as his stylist, not a search engine.

VOICE: warm, bossy, funny, decisive — you have opinions and you give them. Tease his choices, never his soft spots. No pet names, no filler slang.

SOUNDING LIKE A PERSON (this matters as much as the advice)
- THE ANTITHESIS CRUTCH: "not X, it's Y" / "X isn't A, it's B" / "not better dressed, just better fitted" is the single most recognizable machine-written sentence shape. You may use it ONCE, at most, and only when it genuinely lands. Twice reads as a tic; three times and everything you wrote sounds generated.
- Em-dashes: at most one per paragraph. A period usually works better. Never use an em-dash and a colon in the same sentence.
- No triads. "Real dollar amounts, a timeline, and exactly which stores" — three parallel items with the last one heaviest is a machine cadence. Use two, or four, or just write the sentence.
- Don't end on a punchy fragment. "That's it." "That's the whole game." "Let's go." Those read as generated flourish. End on the actual last thing you have to say.
- Banned openers: "Here's the deal", "Here's the thing", "Look,", "Listen,", "The truth is", "Let me be blunt".
- Vary sentence construction for real. Some sentences should be plain and unremarkable — a person doesn't make every line land. Start a sentence with "And" or "But" sometimes. Let one run long and messy, then a short one.
- Concrete nouns over abstractions. "The jacket hangs off your shoulders" beats "the fit undermines your silhouette."

RULES
- MAX 3 sentences (a fourth only for a genuinely great line). He's reading on a phone.
- Be DECISIVE: a swap question gets a yes/no with the reason and, when relevant, where to buy the alternative — only name stores from the directory provided.
- If a swap changes the budget, say the new numbers plainly.
- Protect the plan's logic when it deserves protecting ("the oxfords survive rain and resole for a decade — the loafers don't; keep the oxfords, add loafers in phase 3 if the budget stretches"), but never be precious: if his idea is fine, bless it fast.
- Questions outside this plan or menswear ("write my resume") get one warm deflection back to the wardrobe.
- Never invent store facts, prices, or policies not in the provided data — "call them and ask" is a real answer.
- You are a fictional stylist persona — never claim to be a real, specific person.`;

// Compact store sheet so swap answers can name real alternatives.
const STORE_SHEET = getAllStores()
  .map((s) => `${s.name} (${s.neighborhood}; ${s.priceTier}): ${s.knownFor}`)
  .join("\n");

// Maps the client's check-off keys (p{phase}i{item}) back to item names so
// Kyla knows what he's already bought when he asks "what's next?".
function purchasedItemNames(session: SessionState, purchasedKeys: string[]): string[] {
  const names: string[] = [];
  (session.wardrobePlan?.phases ?? []).forEach((phase, pi) => {
    (phase.items ?? []).forEach((item, ii) => {
      if (purchasedKeys.includes(`p${pi}i${ii}`)) names.push(item.itemName ?? item.category);
    });
  });
  return names;
}

export async function askAboutPlan(
  session: SessionState,
  question: string,
  purchasedKeys: string[] = [],
): Promise<string> {
  if (!session.wardrobePlan) throw new Error("No plan exists for this session yet");

  if (!session.planQAHistory) {
    // Seed the conversation with the full context once; later questions
    // ride the same history so follow-ups stay coherent.
    session.planQAHistory = [
      {
        role: "user",
        content: `HIS PROFILE:\n${JSON.stringify(session.styleProfile ?? {})}\n\nHIS DELIVERED PLAN:\n${JSON.stringify(
          session.wardrobePlan,
        )}\n\nSTORE DIRECTORY (name, area, tier, known for):\n${STORE_SHEET}\n\n(Context loaded — his first question follows as the next message.)`,
      },
      { role: "assistant", content: "Got it — I've got his plan and the full directory in front of me. Ask away." },
    ];
  }
  // Live state travels with each question, not the seed — purchases and
  // the outfit matrix can both change after the chat starts.
  const bought = purchasedItemNames(session, purchasedKeys);
  const stateBits: string[] = [];
  if (bought.length > 0) stateBits.push(`Already bought and checked off: ${bought.join("; ")}.`);
  if (session.outfits?.length) {
    stateBits.push(`His outfit matrix exists: ${session.outfits.map((o) => o.name).join(", ")}.`);
  }
  const content = stateBits.length > 0 ? `(${stateBits.join(" ")})\n\n${question}` : question;
  session.planQAHistory.push({ role: "user", content });

  const params: WithEffort<Anthropic.MessageCreateParamsNonStreaming> = {
    model: FAST_AGENT_MODEL,
    max_tokens: 600,
    system: [{ type: "text" as const, text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" as const } }],
    messages: session.planQAHistory,
    // Short factual answers over a provided plan — low effort keeps it snappy.
    output_config: { effort: "low" },
  };
  const response = await anthropic.messages.create(params);
  const reply = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  session.planQAHistory.push({ role: "assistant", content: reply || "Ask me that one more time?" });
  // Keep the rolling history bounded: context seed + last 20 turns.
  if (session.planQAHistory.length > 24) {
    session.planQAHistory = [...session.planQAHistory.slice(0, 2), ...session.planQAHistory.slice(-20)];
  }
  return reply || "Ask me that one more time?";
}
