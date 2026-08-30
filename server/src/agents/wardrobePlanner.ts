import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "../anthropicClient";
import { AGENT_MODEL } from "../config";
import type { ScoutReport } from "./storeScout";
import type { PhotoAssessment, StyleProfile, WardrobePlan } from "../types";

/**
 * "Moon" — Wardrobe Planner Agent, named in homage to the Hall of Fame
 * quarterback who ran Houston's whole offense.
 *
 * The final synthesis step: takes the style profile, the (optional) photo
 * assessment, the Houston climate/style brief, and every store scout's
 * recommendations, and produces one phased, budgeted, store-by-store plan.
 */

const SYSTEM_PROMPT = `You are Moon, the wardrobe planning agent inside the Bayou & Blazer men's style app — the quarterback of the operation. You are handed a man's style profile, an optional photo-based style assessment, a Houston climate/culture brief, and a set of Houston store recommendations already vetted by specialist scouts. Your job is to turn all of that into ONE coherent, phased, budgeted wardrobe plan — the full game plan, called from the pocket.

VOICE: confident, energetic, a little funny, genuinely useful — a quarterback walking his guy through the game plan, not a corporate stylist deck. Light football/game-plan framing is welcome where it lands naturally (phases as quarters, the plan as a playbook, the final word as a locker-room send-off), but never at the cost of clarity, and don't force a sports metaphor into every sentence. Keep it real: name specific pieces, specific stores, specific dollar ranges.

RULES
- Only recommend stores from the provided list of vetted candidates (by id) — never invent a store name or id.
- EVERY item MUST have at least one store id in recommendedStoreIds — a primary store, plus a backup when a genuinely good one exists in the vetted list. An item with an empty recommendedStoreIds array is a broken plan; there is no such thing as an item he can't buy anywhere. Pick the vetted store whose actual inventory (each candidate's whatItIs/bestFor describes what it really carries) best matches the item and his budget.
- Build 3-5 phases across a sensible timeline given his stated timeline and budget cadence (e.g. "Right Now (Weeks 1-2): the foundation", "Month 2: outerwear & shoes", "Before [occasion]: the event pieces", "Ongoing: the finishing touches"). Order phases by real priority, not by category type.
- Every line-item wardrobe piece needs: category, description, quantity, a realistic USD budget range for Houston, a priority (essential/recommended/nice-to-have), which vetted store id(s) to buy it from, and buyingNotes.
- buyingNotes is the whole point of this plan being usable in a store, not just readable on a phone: write it like he could hand his phone to the salesperson and point at it. Always include, in this order: (a) an actual opening line to say when he walks in ("I'm looking for a navy tropical-wool suit, slim through the body, budget around $X" — not "ask about suits"), (b) the one or two specs/details that matter most for HIS fit, face, and coloring (reference his fitPreferences, colorPreferences/colorsToAvoid, and — if provided — the photo assessment's fitGuidance, bestColors, colorsToAvoidFromPhotos, bodyType, faceShape, and faceGuidance by name, not generically; for shirts, knitwear, jackets, and neckwear especially, let faceGuidance drive collar spread, neckline, and lapel choices), (c) one specific thing to decline or steer away from if the salesperson offers it (a cut, fabric, color, or upsell that works against his stated style or the photo assessment) — this is what actually keeps him from getting sold the wrong thing, and (d) practical logistics drawn from the store's OWN profile: whether it's walk-in or appointment (per its howToBuy), its phone/contact when one is listed, its neighborhood, what to bring, and alteration turnaround.
- ROUTE FOR HOUSTON GEOGRAPHY: if his profile includes a homeBase, use it against each vetted store's neighborhood. When two vetted stores fit an item comparably, pick the closer one; when the best store is across town, keep it but say in buyingNotes why it earns the drive. Where several items land in the same part of town, note it so he can knock them out in one trip — a plan that respects Houston traffic is a plan that actually gets executed.
- Respect the climate brief: weight the plan toward breathable/lightweight pieces if that's what Houston calls for, and place any cold-weather or gala pieces in the correct seasonal phase.
- Respect his stated budget total and cadence — the sum of essential+recommended items across the plan should be a realistic fit for his budget, not wildly over it. If his budget can't realistically cover everything on his wish list, prioritize essentials and be upfront about what's a stretch goal.
- If a photo assessment is provided, actively use its fit/color/silhouette guidance AND its faceShape/faceGuidance/bodyType reads to shape specific item choices (fits, collar styles, necklines, lapels, colors to seek or avoid) AND to personalize buyingNotes as described above. If his faceShape is known, he visibly wears glasses in the photos or an eyewear store was vetted, and the budget has room, a frames item (usually nice-to-have) with shape-specific guidance is a high-impact, low-cost addition most men never think of.
- Write a short, punchy intro narrative and a short, hyped final pep talk in your voice — the pep talk is the locker-room send-off before he runs the plan.
- Call submit_wardrobe_plan exactly once with the complete plan.`;

const WARDROBE_ITEM_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string" },
    description: { type: "string" },
    quantity: { type: "number" },
    estimatedBudgetLowUsd: { type: "number" },
    estimatedBudgetHighUsd: { type: "number" },
    priority: { type: "string", enum: ["essential", "recommended", "nice-to-have"] },
    recommendedStoreIds: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      description: "At least one vetted store id where this item should be bought — primary first, backup second.",
    },
    buyingNotes: {
      type: "string",
      description:
        "The in-store script for this item: an opening line to say, the fit/color specs that matter most for this specific man, one thing to decline if offered, and practical buying logistics.",
    },
  },
  required: [
    "category",
    "description",
    "quantity",
    "estimatedBudgetLowUsd",
    "estimatedBudgetHighUsd",
    "priority",
    "recommendedStoreIds",
    "buyingNotes",
  ],
} as const;

const SUBMIT_PLAN_TOOL: Anthropic.Tool = {
  name: "submit_wardrobe_plan",
  description: "Submit the complete phased wardrobe plan.",
  input_schema: {
    type: "object",
    properties: {
      guideTitle: { type: "string", description: "A catchy title for this man's personal guide." },
      introNarrative: { type: "string" },
      climateNotes: { type: "string", description: "How Houston's climate specifically shapes this plan." },
      phases: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            timingLabel: { type: "string" },
            goal: { type: "string" },
            items: { type: "array", items: WARDROBE_ITEM_SCHEMA },
          },
          required: ["name", "timingLabel", "goal", "items"],
        },
      },
      budgetSummary: {
        type: "object",
        properties: {
          totalBudgetUsd: { type: "number" },
          perPhaseUsd: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phaseName: { type: "string" },
                amountUsd: { type: "number" },
              },
              required: ["phaseName", "amountUsd"],
            },
          },
        },
        required: ["totalBudgetUsd", "perPhaseUsd"],
      },
      generalBuyingTips: { type: "array", items: { type: "string" } },
      finalPepTalk: { type: "string" },
    },
    required: ["guideTitle", "introNarrative", "climateNotes", "phases", "budgetSummary", "generalBuyingTips", "finalPepTalk"],
  },
};

export async function buildWardrobePlan(args: {
  profile: StyleProfile;
  photoAssessment?: PhotoAssessment;
  climateBrief: string;
  scoutReports: ScoutReport[];
}): Promise<WardrobePlan> {
  const { profile, photoAssessment, climateBrief, scoutReports } = args;

  // The planner gets each vetted store's full profile — what it actually
  // carries, how buying there works, and its contact — so item-to-store
  // matching reflects real inventory, and buyingNotes can tell the man
  // exactly who to call and how to book.
  const vettedStores = scoutReports.flatMap((report) =>
    report.recommendations.map((r) => ({
      id: r.store.id,
      name: r.store.name,
      category: r.store.category,
      neighborhood: r.store.neighborhood,
      priceTier: r.store.priceTier,
      whatItIs: r.store.description,
      bestFor: r.store.bestFor,
      howToBuy: r.store.howToBuy,
      contact: r.store.contact ?? "no phone listed — use its website",
      scoutReason: r.reason,
    })),
  );

  const userMessage = `STYLE PROFILE:
${JSON.stringify(profile, null, 2)}

PHOTO ASSESSMENT:
${photoAssessment ? JSON.stringify(photoAssessment, null, 2) : "None provided — the man did not upload photos."}

HOUSTON CLIMATE & STYLE BRIEF:
${climateBrief}

VETTED STORE CANDIDATES (use ONLY these ids in recommendedStoreIds):
${JSON.stringify(vettedStores, null, 2)}

Build the complete wardrobe plan now.`;

  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model: AGENT_MODEL,
    // Bumped from 8192 after enriching buyingNotes (opening line + specs +
    // decline + logistics) pushed a live plan to stop_reason "max_tokens"
    // mid-JSON, truncating the tool call before phases/budgetSummary/tips
    // were ever written. Kept high with the enriched field in place.
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    tools: [SUBMIT_PLAN_TOOL],
    tool_choice: { type: "tool", name: "submit_wardrobe_plan" },
    // Left at default (high) effort deliberately: dropping to "medium" was
    // tried and reverted after a live test produced budget phases that
    // summed to $3,560 against a stated $2,500 total — high effort has
    // consistently gotten this arithmetic right. The fire-and-forget +
    // polling change is what actually fixes host request timeouts; this
    // agent doesn't need to also be fast.
  };
  const response = await anthropic.messages.create(params);

  // A "max_tokens" stop reason means the tool call's JSON was cut off
  // mid-generation — the API still hands back a best-effort parse of
  // whatever was written so far, so toolUse can exist here with phases,
  // budgetSummary, etc. silently missing. Fail loudly instead of serving a
  // plan with an empty budget and no phases (this is exactly how a real
  // truncation bug looked live before max_tokens was raised).
  if (response.stop_reason === "max_tokens") {
    throw new Error("Wardrobe planner response was cut off before completing the plan (hit max_tokens)");
  }

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "submit_wardrobe_plan",
  );
  if (!toolUse) {
    throw new Error("Wardrobe planner did not return a plan");
  }

  return normalizeWardrobePlan(toolUse.input);
}

// The model occasionally emits a nested array/object field as a JSON
// *string* inside the tool input (seen live: phases arrived stringified,
// crashing the client's phases.map). Parse those back, then validate hard —
// a malformed plan must become a retryable error, never a stored plan.
function normalizeWardrobePlan(raw: unknown): WardrobePlan {
  const plan = { ...(raw as Record<string, unknown>) };

  const parseIfString = (v: unknown): unknown => {
    if (typeof v !== "string") return v;
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  };

  plan.phases = parseIfString(plan.phases);
  plan.generalBuyingTips = parseIfString(plan.generalBuyingTips);
  plan.budgetSummary = parseIfString(plan.budgetSummary);
  if (plan.budgetSummary && typeof plan.budgetSummary === "object") {
    const bs = plan.budgetSummary as Record<string, unknown>;
    bs.perPhaseUsd = parseIfString(bs.perPhaseUsd);
  }
  if (Array.isArray(plan.phases)) {
    for (const phase of plan.phases as Record<string, unknown>[]) {
      if (phase && typeof phase === "object") {
        phase.items = parseIfString(phase.items);
        if (Array.isArray(phase.items)) {
          for (const item of phase.items as Record<string, unknown>[]) {
            if (item && typeof item === "object") {
              item.recommendedStoreIds = parseIfString(item.recommendedStoreIds);
            }
          }
        }
      }
    }
  }

  if (!Array.isArray(plan.phases) || plan.phases.length === 0) {
    throw new Error("Wardrobe planner returned malformed phases — retry plan generation");
  }
  if ((plan.phases as unknown[]).some((p) => !p || typeof p !== "object" || !Array.isArray((p as any).items))) {
    throw new Error("Wardrobe planner returned a phase without a valid items array — retry plan generation");
  }

  return plan as unknown as WardrobePlan;
}
