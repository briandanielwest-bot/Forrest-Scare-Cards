import type Anthropic from "@anthropic-ai/sdk";
import { sanitizeVoice } from "./voice";
import { anthropic, type WithEffort } from "../anthropicClient";
import { FAST_AGENT_MODEL } from "../config";
import { getStoresByCategory, STORE_CATEGORY_LABELS, type HoustonStore, type StoreCategory } from "../data/houstonStores";
import { coerceArray } from "./toolInput";
import type { StyleProfile } from "../types";

/**
 * Houston Store Scout Agents.
 *
 * Broken up by category, as a single "review every store in Houston" agent
 * would be both unfocused and a single point of failure. Each scout only
 * ever sees its own slice of the seed dataset (data/houstonStores.ts) and
 * ranks it against the man's StyleProfile + the Houston climate brief.
 */

export interface StoreRecommendation {
  store: HoustonStore;
  reason: string;
}

export interface ScoutReport {
  scoutName: string;
  categories: StoreCategory[];
  recommendations: StoreRecommendation[];
}

interface ScoutDefinition {
  scoutName: string;
  categories: StoreCategory[];
  focus: string;
}

// Scout names are a fan homage to Houston sports legends, matched to each
// role — the craftsman, the smoothest style in the building, the footwork,
// the closer. Not affiliated with or endorsed by the people they honor.
const SCOUT_DEFINITIONS: ScoutDefinition[] = [
  {
    scoutName: "Biggio (Director of Tailoring)",
    categories: ["bespoke-tailoring", "alterations"],
    focus:
      "custom and made-to-measure tailoring, suits and shirts built or fitted specifically to this man, plus dedicated alterations shops for making off-the-rack pieces fit",
  },
  {
    scoutName: "Drexler (Director of Designer Floors)",
    categories: ["luxury-department", "contemporary-boutique", "formal-wear", "big-tall"],
    focus:
      "designer ready-to-wear, department-store and big & tall menswear, contemporary boutique pieces, and tuxedo/formal-wear for black-tie events",
  },
  {
    scoutName: "Olajuwon (Director of Footwear)",
    categories: ["western-boots-leather", "footwear"],
    focus: "dress and casual footwear, plus boots and western wear for the man who genuinely wants that category, not a default push toward it",
  },
  {
    scoutName: "Wagner (Director of Accessories)",
    categories: ["lifestyle-accessories", "eyewear"],
    focus:
      "grooming, small leather goods, finishing accessories, and eyewear (the planner downstream matches frames to his face shape, so include an eyewear option at his price tier when glasses could plausibly matter)",
  },
];

const RECOMMEND_TOOL: Anthropic.Tool = {
  name: "submit_recommendations",
  description: "Submit the ranked store recommendations for this category.",
  input_schema: {
    type: "object",
    properties: {
      recommendations: {
        type: "array",
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            storeId: { type: "string" },
            reason: {
              type: "string",
              description:
                "Why this store fits THIS man: the specific item he'd buy there + the store fact that earns it. MAX 25 words.",
            },
          },
          required: ["storeId", "reason"],
        },
      },
    },
    required: ["recommendations"],
  },
};

function buildSystemPrompt(def: ScoutDefinition): string {
  const plainName = def.scoutName.split(" (")[0];
  return `You are ${plainName}, a Houston menswear buying director inside the Bayou & Blazer app, a seasoned category expert in ${def.focus}. You will be given a candidate list of real Houston stores in your specialty, each with a full profile of what it carries, how buying there works, its neighborhood, and its price tier, and a man's style profile. Read each store's full profile so your recommendation reflects what that store actually sells and how it actually operates, then pick and rank the stores that best fit HIS budget, style, and lifestyle. If his profile includes a homeBase (where in the Houston area he lives/works), weigh each store's neighborhood against it, Houston distances are real, and a store he'll actually get to beats a marginally better one 45 minutes away; a genuinely superior fit can still earn the drive, just say so in the reason. Do not recommend a store outside the given list, and do not recommend a store that is clearly a budget mismatch (e.g. a $$$$ bespoke house for a shoestring budget) unless nothing else in the list fits. Each reason must name the SPECIFIC thing he'd buy there and why THAT store earns it, lean on each store's knownFor (its signature items) and catersTo (its real clientele): "his paper-pattern dress shirts, because a fit file means every reorder fits" beats "good for shirts". If a store's catersTo clearly isn't him, that's a reason to rank it down even when the category matches. A "rightNow" note on a store is current, live-researched intel, weigh it (a running sale can promote a store; a disruption can demote it). Each store's brands, pricePoints, and insiderTake are researched facts: use them to be specific and to price-match him honestly ("their MTM starts at $1,295" beats "they do custom"), and never claim a brand or price that isn't in that data. Those facts must make your reason SHORTER and sharper, never longer, the 25-word cap is absolute, and a named brand should replace a vague phrase rather than extend it. Recommend your TOP 3 (4 only when a fourth genuinely earns it), the planner needs your best calls, not coverage. Each reason MAX 25 words: the item he'd buy + the store fact that wins it, nothing else. Call submit_recommendations exactly once.`;
}

async function runScout(def: ScoutDefinition, profile: StyleProfile, climateBrief: string, extraContext?: string): Promise<ScoutReport> {
  const candidates = def.categories.flatMap((c) => getStoresByCategory(c));

  if (candidates.length === 0) {
    return { scoutName: def.scoutName, categories: def.categories, recommendations: [] };
  }

  // Everything stable per scout — persona, climate brief, candidate store
  // profiles — lives in the system prompt under one cache breakpoint, so
  // the API processes it once and reuses it across turns AND across
  // different users' runs. Only the man's profile varies per request.
  const systemText = `${buildSystemPrompt(def)}

HOUSTON CLIMATE CONTEXT:
${climateBrief}

CANDIDATE STORES (${def.categories.map((c) => STORE_CATEGORY_LABELS[c]).join(", ")}):
${JSON.stringify(
    candidates.map((c) => ({
      id: c.id,
      name: c.name,
      neighborhood: c.neighborhood,
      priceTier: c.priceTier,
      styleTags: c.styleTags,
      whatItIs: c.description,
      knownFor: c.knownFor,
      catersTo: c.catersTo,
      bestFor: c.bestFor,
      howToBuy: c.howToBuy,
      rightNow: c.seasonalNote,
      brands: c.brands,
      pricePoints: c.pricePoints,
      insiderTake: c.insiderTake,
    })),
    null,
    2,
  )}`;

  const userMessage = `MAN'S STYLE PROFILE:
${JSON.stringify(profile, null, 2)}${extraContext ? `\n\n${extraContext}` : ""}`;

  const params: WithEffort<Anthropic.MessageCreateParamsNonStreaming> = {
    model: FAST_AGENT_MODEL,
    max_tokens: 3000,
    system: [{ type: "text" as const, text: systemText, cache_control: { type: "ephemeral" as const } }],
    messages: [{ role: "user", content: userMessage }],
    tools: [RECOMMEND_TOOL],
    tool_choice: { type: "tool", name: "submit_recommendations" },
    // Ranking a short candidate list against a profile doesn't need deep
    // reasoning, and four of these run in parallel ahead of the planner —
    // low effort here is the single biggest lever on total wait time.
    output_config: { effort: "low" },
  };
  const response = await anthropic.messages.create(params);

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "submit_recommendations",
  );
  const rawRecs = coerceArray<{ storeId: string; reason: string }>(
    (toolUse?.input as { recommendations?: unknown } | undefined)?.recommendations,
  );

  const recommendations: StoreRecommendation[] = rawRecs
    .map((r) => {
      const store = candidates.find((c) => c.id === r.storeId);
      return store ? { store, reason: sanitizeVoice(r.reason) } : undefined;
    })
    .filter((r): r is StoreRecommendation => Boolean(r));

  return { scoutName: def.scoutName, categories: def.categories, recommendations };
}

export async function runAllScouts(profile: StyleProfile, climateBrief: string): Promise<ScoutReport[]> {
  return Promise.all(SCOUT_DEFINITIONS.map((def) => runScout(def, profile, climateBrief)));
}

// The late-photo courtesy pass: the directors usually finish before Watt's
// photo read lands (that's the right latency trade). When a face read
// exists, the accessories director — whose eyewear calls depend on face
// shape most — gets one re-run with it. ~4s, only when photos were
// actually uploaded.
export async function rerunAccessoriesWithFace(
  profile: StyleProfile,
  climateBrief: string,
  faceContext: string,
): Promise<ScoutReport | null> {
  const def = SCOUT_DEFINITIONS.find((d) => d.categories.includes("eyewear")) ?? SCOUT_DEFINITIONS[SCOUT_DEFINITIONS.length - 1];
  try {
    return await runScout(def, profile, climateBrief, `PHOTO TEAM'S FACE READ (weigh for eyewear and accessory picks):\n${faceContext}`);
  } catch (err) {
    console.warn(`[scouts] face re-run failed (${(err as Error).message?.slice(0, 60)}), keeping original picks`);
    return null;
  }
}
