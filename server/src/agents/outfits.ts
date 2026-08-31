import type Anthropic from "@anthropic-ai/sdk";
import { sanitizeVoice } from "./voice";
import { anthropic, type WithEffort } from "../anthropicClient";
import { FAST_AGENT_MODEL } from "../config";
import { coerceArray } from "./toolInput";
import type { SessionState } from "../types";

/**
 * The outfit matrix — the capsule-wardrobe payoff: "these 11 pieces make
 * 14 outfits." Generated only when the user asks (a button on the plan),
 * so it adds zero latency to plan generation, then cached on the session.
 */

export interface Outfit {
  name: string;
  occasion: string;
  pieces: string[];
}

const SYSTEM_PROMPT = `You are Kyla, the Lead Stylist of Bayou & Blazer. You'll be given the itemized wardrobe plan your team built for one man, plus his profile. Build his OUTFIT MATRIX: every genuinely good outfit those specific pieces combine into.

RULES
- Use ONLY pieces from his plan (refer to them by their itemName). Assume basics he obviously owns (plain white tee, socks) without listing them.
- 8-14 outfits, each: a punchy name (max 5 words, your voice), the occasion it wins (max 6 words), and the 3-5 pieces that make it.
- Cover his real life: his work dress codes first, then client/event looks, then off-duty. No fantasy occasions he didn't mention.
- Every wearable piece appears in at least one outfit; his most-worn categories anchor several.
- No commentary outside the tool call, submit_outfits once with the full matrix.`;

const SUBMIT_OUTFITS_TOOL: Anthropic.Tool = {
  name: "submit_outfits",
  description: "Submit the complete outfit matrix.",
  input_schema: {
    type: "object",
    properties: {
      outfits: {
        type: "array",
        minItems: 8,
        maxItems: 14,
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Punchy outfit name, MAX 5 words." },
            occasion: { type: "string", description: "Where this outfit wins, MAX 6 words." },
            pieces: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
          },
          required: ["name", "occasion", "pieces"],
        },
      },
    },
    required: ["outfits"],
  },
};

export async function buildOutfitMatrix(session: SessionState): Promise<Outfit[]> {
  if (!session.wardrobePlan) throw new Error("No plan to build outfits from");
  if (session.outfits) return session.outfits;

  const items = (session.wardrobePlan.phases ?? []).flatMap((p) =>
    (p.items ?? []).map((i) => `${i.itemName ?? i.category} (${i.category})`),
  );
  const params: WithEffort<Anthropic.MessageCreateParamsNonStreaming> = {
    model: FAST_AGENT_MODEL,
    max_tokens: 3000,
    system: [{ type: "text" as const, text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" as const } }],
    messages: [
      {
        role: "user",
        content: `HIS PROFILE:\n${JSON.stringify(session.styleProfile ?? {})}\n\nHIS PLAN'S PIECES:\n${items.join("\n")}`,
      },
    ],
    tools: [SUBMIT_OUTFITS_TOOL],
    tool_choice: { type: "tool", name: "submit_outfits" },
    output_config: { effort: "low" },
  };
  const response = await anthropic.messages.create(params);
  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "submit_outfits",
  );
  if (!toolUse) throw new Error("Outfit matrix did not come back");
  const raw = coerceArray<Record<string, unknown>>((toolUse.input as { outfits?: unknown }).outfits);
  const outfits: Outfit[] = raw
    .filter((o) => o && typeof o === "object")
    .map((o) => ({
      name: sanitizeVoice(String(o.name ?? "Look")),
      occasion: sanitizeVoice(String(o.occasion ?? "")),
      pieces: coerceArray<string>(o.pieces).filter((p): p is string => typeof p === "string"),
    }))
    .filter((o) => o.pieces.length > 0);
  if (outfits.length === 0) throw new Error("Outfit matrix came back empty");
  session.outfits = outfits;
  return outfits;
}
