import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "../anthropicClient";
import { AGENT_MODEL } from "../config";
import type { ScoutReport } from "./storeScout";
import { PRICE_AND_TIMING_REALITY } from "../data/houstonKnowledge";
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
- EVERY item MUST have at least one store id in recommendedStoreIds — a primary store, plus a backup when a genuinely good one exists in the vetted list. An item with an empty recommendedStoreIds array is a broken plan; there is no such thing as an item he can't buy anywhere. Pick the vetted store whose actual inventory best matches the item and his budget — each candidate's knownFor names its signature items and catersTo names its real clientele, and the match should run item-to-signature, not just item-to-category. The whyThisStore field carries the justification; a "rightNow" note on a store (live-researched current intel — a sale, a move, a program) belongs in logistics or phase timing when it genuinely helps ("their sale is running — buy this phase first").
- Build 3-5 phases across a sensible timeline given his stated timeline and budget cadence (e.g. "Right Now (Weeks 1-2): the foundation", "Month 2: outerwear & shoes", "Before [occasion]: the event pieces", "Ongoing: the finishing touches"). Order phases by real priority, not by category type.
- Every line-item wardrobe piece needs: category, description, quantity, a realistic USD budget range for Houston, a priority (essential/recommended/nice-to-have), which vetted store id(s) to buy it from, and the five in-store script fields below.
- THE IN-STORE SCRIPT IS FIVE SHORT FIELDS, NOT A PARAGRAPH — he reads them standing in the store, so every word has to earn its place. Respect the word caps hard; cutting a good detail beats a dense blob.
  - sayThis (max 30 words): the literal opening line to the salesperson, specific enough to act on — fabric, color, cut, budget ("I'm looking for a navy tropical-wool suit, slim through the body, around $550 with alterations").
  - keySpecs (2-3 bullets, max 12 words each): the specs that matter for HIS fit, face, and coloring — drawn from his stated preferences and, if provided, the photo assessment's fit/face/body reads (for shirts, knits, jackets, neckwear: let the face read drive collar spread, neckline, lapel).
  - decline (max 18 words): the one thing to say no to if offered — the cut, fabric, color, or upsell that fights his style.
  - whyThisStore (max 15 words): why THIS store earns the trip, from its knownFor ("paper pattern on file — reorders fit forever").
  - logistics (max 22 words): walk-in vs appointment per the store's howToBuy, phone if listed, what to bring, turnaround. Fold a "rightNow" sale/timing note here when it helps.
  - Voice rules for all five: stylist language, never schema language (no printing internal field names like fitGuidance or faceShape — say "the photo review showed..."); no field repeats another's content.
- ROUTE FOR HOUSTON GEOGRAPHY: if his profile includes a homeBase, use it against each vetted store's neighborhood. When two vetted stores fit an item comparably, pick the closer one; when the best store is across town, keep it and let whyThisStore justify the drive. Where several items land in the same part of town, note it so he can knock them out in one trip — a plan that respects Houston traffic is a plan that actually gets executed.
- Respect the climate brief: weight the plan toward breathable/lightweight pieces if that's what Houston calls for, and place any cold-weather or gala pieces in the correct seasonal phase.
- Respect his stated budget total and cadence — the sum of essential+recommended items across the plan should be a realistic fit for his budget, not wildly over it. If his budget can't realistically cover everything on his wish list, prioritize essentials and be upfront about what's a stretch goal.
- BUDGET ARITHMETIC IS NON-NEGOTIABLE: before calling submit_wardrobe_plan, add up your perPhaseUsd amounts and confirm they sum to totalBudgetUsd or less — never more. The budget card renders these numbers side by side, and phases that outsum the stated total read as a math error, because they are one. Deliberate stretch goals belong at $0 in the phase totals with the real price stated in the item's text.
- If a photo assessment is provided, actively use its fit/color/silhouette guidance AND its faceShape/faceGuidance/bodyType reads to shape specific item choices (fits, collar styles, necklines, lapels, colors to seek or avoid) AND to personalize sayThis/keySpecs/decline as described above. If his faceShape is known, he visibly wears glasses in the photos or an eyewear store was vetted, and the budget has room, a frames item (usually nice-to-have) with shape-specific guidance is a high-impact, low-cost addition most men never think of.
- Write a short, punchy intro narrative and a short, hyped final pep talk in your voice — the pep talk is the locker-room send-off before he runs the plan.
- If the profile notes carry a "North star:" line — what he wants people to think when he walks in — it outranks everything stylistic: open the intro narrative from it, let it settle close calls between items, and bring it back in the pep talk ("every piece here is pointed at 'walks in like he owns the room'").
- If the notes carry an "Urgent:" line (an event inside ~2 weeks), Phase 1 exists to win that event: only same-week-attainable pieces (in-stock + fast alterations, never made-to-measure lead times), and say plainly in that phase's goal what he should wear to the event itself — even if it's mostly clothes he already owns, dialed in by a tailor.
- Call submit_wardrobe_plan exactly once with the complete plan.

${PRICE_AND_TIMING_REALITY}
Use the reality tables above for every budget range, alterations reserve, lead time, and buy-timing call — they are your pricing ground truth for Houston; don't re-derive them.`;

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
    sayThis: {
      type: "string",
      description: "The exact opening line to say to the salesperson, in quotes-ready form. MAX 30 words.",
    },
    keySpecs: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 3,
      description: "2-3 fit/color specs that matter for THIS man. Each a short phrase, MAX 12 words.",
    },
    decline: {
      type: "string",
      description: "The one thing to say no to if offered. MAX 18 words.",
    },
    whyThisStore: {
      type: "string",
      description: "Why this store earns the trip, from its knownFor. MAX 15 words.",
    },
    logistics: {
      type: "string",
      description: "Walk-in vs appointment, phone if listed, what to bring, turnaround. MAX 22 words.",
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
    "sayThis",
    "keySpecs",
    "decline",
    "whyThisStore",
    "logistics",
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
  // matching reflects real inventory, and the script fields can tell the man
  // exactly who to call and how to book.
  const vettedStores = scoutReports.flatMap((report) =>
    report.recommendations.map((r) => ({
      id: r.store.id,
      name: r.store.name,
      category: r.store.category,
      neighborhood: r.store.neighborhood,
      priceTier: r.store.priceTier,
      whatItIs: r.store.description,
      knownFor: r.store.knownFor,
      catersTo: r.store.catersTo,
      bestFor: r.store.bestFor,
      howToBuy: r.store.howToBuy,
      rightNow: r.store.seasonalNote,
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

  // Streamed rather than messages.create: the plan is the longest output in
  // the app (observed 10-13K tokens and growing with every feature), and a
  // live truncation at the old 16000 non-streaming cap shipped a plan with
  // no phases. Streaming lets max_tokens sit far above any real plan size
  // without risking SDK HTTP timeouts.
  const baseParams = {
    model: AGENT_MODEL,
    max_tokens: 64000,
    // Stable across every run — cacheable across users on the same model.
    system: [{ type: "text" as const, text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" as const } }],
    messages: [{ role: "user", content: userMessage }] as Anthropic.MessageParam[],
    tools: [SUBMIT_PLAN_TOOL],
    tool_choice: { type: "tool" as const, name: "submit_wardrobe_plan" },
    // Left at default (high) effort deliberately: dropping to "medium" was
    // tried and reverted after a live test produced budget phases that
    // summed to $3,560 against a stated $2,500 total — high effort has
    // consistently gotten this arithmetic right.
  };

  // The planner is the run's dominant wall-clock cost (~2 min of pure
  // output generation), so it opts into fast mode: the same Opus model at
  // up to 2.5x output speed (research preview, premium-priced, Claude API
  // only). Any failure — the beta being unavailable, a fast-mode-specific
  // rate limit, a non-Opus model override — falls back to the standard
  // lane, so quality and reliability never depend on it. Note the two
  // lanes keep separate prompt caches.
  let response: Anthropic.Message;
  try {
    const fastStream = anthropic.beta.messages.stream({
      ...baseParams,
      speed: "fast",
      betas: ["fast-mode-2026-02-01"],
      // speed/betas aren't typed on this SDK version's stream params yet.
    } as never);
    response = (await fastStream.finalMessage()) as Anthropic.Message;
    console.log("[planner] fast mode");
  } catch (err) {
    console.warn(`[planner] fast mode unavailable (${(err as Error).message?.slice(0, 80)}) — standard lane`);
    const stream = anthropic.messages.stream(baseParams);
    response = await stream.finalMessage();
  }

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
              item.keySpecs = parseIfString(item.keySpecs);
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
