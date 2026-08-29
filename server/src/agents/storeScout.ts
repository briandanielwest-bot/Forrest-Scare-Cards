import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "../anthropicClient";
import { AGENT_MODEL } from "../config";
import { getStoresByCategory, STORE_CATEGORY_LABELS, type HoustonStore, type StoreCategory } from "../data/houstonStores";
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

const SCOUT_DEFINITIONS: ScoutDefinition[] = [
  {
    scoutName: "The Cutter (Bespoke & Made-to-Measure Scout)",
    categories: ["bespoke-tailoring"],
    focus: "custom and made-to-measure tailoring — suits and shirts built or fitted specifically to this man",
  },
  {
    scoutName: "The Floor (Luxury Department & Contemporary Scout)",
    categories: ["luxury-department", "contemporary-boutique"],
    focus: "designer ready-to-wear, department-store menswear, and contemporary boutique pieces",
  },
  {
    scoutName: "The Ranch Hand (Western & Footwear Scout)",
    categories: ["western-boots-leather", "footwear"],
    focus: "boots, western wear, and dress/casual footwear",
  },
  {
    scoutName: "The Finisher (Lifestyle & Accessories Scout)",
    categories: ["lifestyle-accessories"],
    focus: "grooming, small leather goods, and finishing accessories",
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
        items: {
          type: "object",
          properties: {
            storeId: { type: "string" },
            reason: { type: "string", description: "1-2 sentences on why this store fits THIS man specifically." },
          },
          required: ["storeId", "reason"],
        },
      },
    },
    required: ["recommendations"],
  },
};

function buildSystemPrompt(def: ScoutDefinition): string {
  return `You are "${def.scoutName}," a Houston menswear store scout inside the Bayou & Blazer app. You specialize in ${def.focus}. You will be given a candidate list of real Houston stores in your specialty and a man's style profile. Pick and rank the stores from the candidate list that best fit HIS budget, style, and lifestyle — do not recommend a store outside the given list, and do not recommend a store that is clearly a budget mismatch (e.g. a $$$$ bespoke house for a shoestring budget) unless nothing else in the list fits. It's fine to recommend fewer stores than are in the list, or all of them, if all genuinely fit. Call submit_recommendations exactly once.`;
}

async function runScout(def: ScoutDefinition, profile: StyleProfile, climateBrief: string): Promise<ScoutReport> {
  const candidates = def.categories.flatMap((c) => getStoresByCategory(c));

  if (candidates.length === 0) {
    return { scoutName: def.scoutName, categories: def.categories, recommendations: [] };
  }

  const userMessage = `MAN'S STYLE PROFILE:
${JSON.stringify(profile, null, 2)}

HOUSTON CLIMATE CONTEXT:
${climateBrief}

CANDIDATE STORES (${def.categories.map((c) => STORE_CATEGORY_LABELS[c]).join(", ")}):
${JSON.stringify(candidates.map((c) => ({ id: c.id, name: c.name, priceTier: c.priceTier, styleTags: c.styleTags, bestFor: c.bestFor })), null, 2)}`;

  const response = await anthropic.messages.create({
    model: AGENT_MODEL,
    max_tokens: 2048,
    system: buildSystemPrompt(def),
    messages: [{ role: "user", content: userMessage }],
    tools: [RECOMMEND_TOOL],
    tool_choice: { type: "tool", name: "submit_recommendations" },
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "submit_recommendations",
  );
  const rawRecs = (toolUse?.input as { recommendations?: { storeId: string; reason: string }[] } | undefined)
    ?.recommendations ?? [];

  const recommendations: StoreRecommendation[] = rawRecs
    .map((r) => {
      const store = candidates.find((c) => c.id === r.storeId);
      return store ? { store, reason: r.reason } : undefined;
    })
    .filter((r): r is StoreRecommendation => Boolean(r));

  return { scoutName: def.scoutName, categories: def.categories, recommendations };
}

export async function runAllScouts(profile: StyleProfile, climateBrief: string): Promise<ScoutReport[]> {
  return Promise.all(SCOUT_DEFINITIONS.map((def) => runScout(def, profile, climateBrief)));
}
