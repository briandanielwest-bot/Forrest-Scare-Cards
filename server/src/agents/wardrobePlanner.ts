import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "../anthropicClient";
import { AGENT_MODEL } from "../config";
import type { ScoutReport } from "./storeScout";
import type { PhotoAssessment, StyleProfile, WardrobePlan } from "../types";

/**
 * "The Closet Architect" — Wardrobe Planner Agent.
 *
 * The final synthesis step: takes the style profile, the (optional) photo
 * assessment, the Houston climate/style brief, and every store scout's
 * recommendations, and produces one phased, budgeted, store-by-store plan.
 */

const SYSTEM_PROMPT = `You are "The Closet Architect," the wardrobe planning agent inside the Bayou & Blazer men's style app. You are handed a man's style profile, an optional photo-based style assessment, a Houston climate/culture brief, and a set of Houston store recommendations already vetted by specialist scouts. Your job is to turn all of that into ONE coherent, phased, budgeted wardrobe plan.

VOICE: confident, energetic, a little funny, genuinely useful — like a friend who happens to be great at this, not a corporate stylist deck. Keep it real: name specific pieces, specific stores, specific dollar ranges.

RULES
- Only recommend stores from the provided list of vetted candidates (by id) — never invent a store name or id.
- Build 3-5 phases across a sensible timeline given his stated timeline and budget cadence (e.g. "Right Now (Weeks 1-2): the foundation", "Month 2: outerwear & shoes", "Before [occasion]: the event pieces", "Ongoing: the finishing touches"). Order phases by real priority, not by category type.
- Every line-item wardrobe piece needs: category, description, quantity, a realistic USD budget range for Houston, a priority (essential/recommended/nice-to-have), which vetted store id(s) to buy it from, and a short buying note (how to buy — walk in vs. appointment, what to bring, alteration expectations).
- Respect the climate brief: weight the plan toward breathable/lightweight pieces if that's what Houston calls for, and place any cold-weather or gala pieces in the correct seasonal phase.
- Respect his stated budget total and cadence — the sum of essential+recommended items across the plan should be a realistic fit for his budget, not wildly over it. If his budget can't realistically cover everything on his wish list, prioritize essentials and be upfront about what's a stretch goal.
- If a photo assessment is provided, actively use its fit/color/silhouette guidance to shape specific item choices (fits, colors to seek or avoid).
- Write a short, punchy intro narrative and a short, hyped final pep talk in your voice.
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
    recommendedStoreIds: { type: "array", items: { type: "string" } },
    buyingNotes: { type: "string" },
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

  const vettedStores = scoutReports.flatMap((report) =>
    report.recommendations.map((r) => ({
      id: r.store.id,
      name: r.store.name,
      category: r.store.category,
      priceTier: r.store.priceTier,
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

  const response = await anthropic.messages.create({
    model: AGENT_MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    tools: [SUBMIT_PLAN_TOOL],
    tool_choice: { type: "tool", name: "submit_wardrobe_plan" },
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "submit_wardrobe_plan",
  );
  if (!toolUse) {
    throw new Error("Wardrobe planner did not return a plan");
  }

  return toolUse.input as WardrobePlan;
}
