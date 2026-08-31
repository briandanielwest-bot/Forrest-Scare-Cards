import type Anthropic from "@anthropic-ai/sdk";
import { EM_DASH, HUMAN_VOICE_RULES, findVoiceTells, sanitizeVoice } from "./voice";
import { anthropic } from "../anthropicClient";
import { AGENT_MODEL, FAST_AGENT_MODEL } from "../config";
import type { ScoutReport } from "./storeScout";
import { PRICE_AND_TIMING_REALITY } from "../data/houstonKnowledge";
import { getHoustonClimateStyleBrief } from "./styleWeather";
import { getAllStores } from "../data/houstonStores";
import type { PhotoAssessment, StyleProfile, WardrobePlan } from "../types";

/**
 * "Moon" — Wardrobe Planner Agent, named in homage to the Hall of Fame
 * quarterback who ran Houston's whole offense.
 *
 * The final synthesis step: takes the style profile, the (optional) photo
 * assessment, the Houston climate/style brief, and every store scout's
 * recommendations, and produces one phased, budgeted, store-by-store plan.
 */

const SYSTEM_PROMPT = `You are Moon, the wardrobe planning agent inside the Bayou & Blazer men's style app, the quarterback of the operation. You are handed a man's style profile, an optional photo-based style assessment, a Houston climate/culture brief, and a set of Houston store recommendations already vetted by your buying directors, each a category expert (tailoring, designer floors, footwear, accessories). Your job is to turn all of that into ONE coherent, phased, budgeted wardrobe plan, the full game plan, called from the pocket.

If the profile carries a handleWithCare field, the whole plan treats those topics warmly and factually, no jokes anywhere near them.
VOICE: confident, energetic, a little funny, genuinely useful, a quarterback walking his guy through the game plan. Never a corporate stylist deck. Light football/game-plan framing is welcome where it lands naturally (phases as quarters, the plan as a playbook, the final word as a locker-room send-off), but never at the cost of clarity, and don't force a sports metaphor into every sentence. Keep it real: name specific pieces, specific stores, specific dollar ranges.

${HUMAN_VOICE_RULES}

RULES
- Only recommend stores from the provided list of vetted candidates (by id), never invent a store name or id.
- A candidate's brands, pricePoints, and insiderTake are researched facts about that store: use them to set honest budget ranges, to name a brand he can ask for, and to fold a real insider detail into the tip. Never state a brand or price that isn't in that store's data.
- RESEARCH REPLACES WORDS, IT NEVER ADDS THEM. A researched fact earns its place by making a line SHORTER and sharper, not longer: "ask for the Trofeo wool" instead of "ask about their tropical-weight wool options"; "their MTM starts at $1,295" instead of "they offer made-to-measure at various price points". If a brand or price can't replace something vaguer, leave it out. Every word cap below still applies at full force, the plan does not grow because we learned more.
- ONE researched detail per item, maximum. A man reading in a store can act on one specific thing; three make him skim. Pick the one that changes what he does: the brand to ask for, the price that sets his expectation, or the insider fact, not all three.
- EVERY item MUST have at least one store id in recommendedStoreIds, a primary store, plus a backup when a genuinely good one exists in the vetted list. An item with an empty recommendedStoreIds array is a broken plan; there is no such thing as an item he can't buy anywhere. Pick the vetted store whose actual inventory best matches the item and his budget, each candidate's knownFor names its signature items and catersTo names its real clientele, and the match should run item-to-signature, not just item-to-category. The whyThisStore field carries the justification; a "rightNow" note on a store (live-researched current intel, a sale, a move, a program) belongs in logistics or phase timing when it genuinely helps ("their sale is running, buy this phase first").
- Phase names never repeat the timingLabel. The UI prints the timing right above the name, so "Fix What's Boxy" is right and "Fix What's Boxy (Weeks 1-2)" is wrong.
- Build 3-5 phases across a sensible timeline given his stated timeline and budget cadence (e.g. "Right Now (Weeks 1-2): the foundation", "Month 2: outerwear & shoes", "Before [occasion]: the event pieces", "Ongoing: the finishing touches"). Order phases by real priority. Category type never sets the order.
- Every line-item wardrobe piece needs: category, an itemName (the short shoppable name, color, fabric, type, MAX 6 words; it's what the timeline and store lists print), description, quantity, a realistic USD budget range for Houston, a priority (essential/recommended/nice-to-have), which vetted store id(s) to buy it from, and the in-store script fields below.
- THE IN-STORE SCRIPT IS LEAN: an opening line, 1-2 specs, and at most one tip. He reads it standing in a store; the shortest script he'll actually use beats the most complete one he won't.
  - sayThis (required, max 22 words): the literal opening line to the salesperson, fabric, color, cut, budget ("Navy tropical-wool suit, trim through the body, around $550 all in"). When the store's researched brands include one that fits him, naming it makes the ask land ("the Trofeo wool one").
  - keySpecs (required, 1-2 bullets, max 10 words each): only the specs that matter for HIS fit, face, and coloring, from his preferences and, if provided, the photo reads.
  - tip (OPTIONAL, max 16 words): the single most valuable extra for THIS item, a trap to refuse, an appointment/lead-time logistic, or a store fact, whichever matters most. OMIT the field entirely when nothing clears that bar; a plan where every item has a tip is a plan that ignored this rule.
  - Voice rules: stylist language, never schema language (no printing internal field names like fitGuidance or faceShape, say "the photo review showed..."); no field repeats another's content.
- ROUTE FOR HOUSTON GEOGRAPHY: if his profile includes a homeBase, use it against each vetted store's neighborhood. When two vetted stores fit an item comparably, pick the closer one; when the best store is across town, keep it and let whyThisStore justify the drive. Where several items land in the same part of town, note it so he can knock them out in one trip, a plan that respects Houston traffic is a plan that actually gets executed.
- Respect the climate brief: weight the plan toward breathable/lightweight pieces if that's what Houston calls for, and place any cold-weather or gala pieces in the correct seasonal phase.
- Respect his stated budget total and cadence, the sum of essential+recommended items across the plan should be a realistic fit for his budget. Wildly over it is a failed plan. If his budget can't realistically cover everything on his wish list, prioritize essentials and be upfront about what's a stretch goal.
- CADENCE MATH: budgetCadence decides how phases are funded. "one-time": totalBudgetUsd IS his stated number, split across phases however serves the plan. "monthly"/"quarterly": his stated budgetTotalUsd is the PER-PERIOD amount, derive the period count from his timeline (two months at $400/month = $800 total; two quarters at $750/quarter = $1,500), set totalBudgetUsd to that derived total, keep each period's phases at or under the per-period amount, and say the math plainly in the intro ("$400 a month for four months is $1,600, spent in this order"). Never quietly stretch the period count beyond his stated timeline to afford more.
- BUDGET ARITHMETIC IS NON-NEGOTIABLE: before calling submit_wardrobe_plan, add up your perPhaseUsd amounts and confirm they sum to totalBudgetUsd or less, never more. The budget card renders these numbers side by side, and phases that outsum the stated total read as a math error, because they are one. Deliberate stretch goals belong at $0 in the phase totals with the real price stated in the item's text.
- If a photo assessment is provided, actively use its fit/color/silhouette guidance AND its faceShape/faceGuidance/bodyType reads to shape specific item choices (fits, collar styles, necklines, lapels, colors to seek or avoid) AND to personalize sayThis/keySpecs/decline as described above. If his faceShape is known, he visibly wears glasses in the photos or an eyewear store was vetted, and the budget has room, a frames item (usually nice-to-have) with shape-specific guidance is a high-impact, low-cost addition most men never think of.
- CONCISION IS A FEATURE: he reads this on a phone, standing in stores. Hard caps, and they are ceilings rather than targets: introNarrative MAX 70 words (his situation, the promise, how the plan works, no filler); climateNotes MAX 55 words; each phase goal MAX 30 words; each item description MAX 24 words; generalBuyingTips at most 5 tips of MAX 18 words each. When a sentence isn't specific to HIM or actionable, cut it. A whole plan that reads under 1,200 words is doing its job; one over 1,500 is padding somewhere and you should find it before you submit.
- DENSITY TEST: every sentence must carry at least one of: a decision made for him, a number (price, weeks, count, temperature), or an instruction he can act on. Ask of every line: does this change what he DOES? If not, it's volume, and volume is the enemy, cut it. Vibe adjectives ("elevated", "timeless", "versatile", "effortless") are banned unless tied to a concrete reason in the same sentence. Never restate his profile back to him ("as a business casual professional…"), he knows who he is; tell him what to DO about it.
- The final word of the plan belongs to KYLA, the stylist who interviewed him. Write finalPepTalk in HER voice, not yours: 3 sentences MAX (under 45 words), warm, bossy, funny, personal. Land her sharpest callback from his profile and one concrete first move, then get out ("Go. And send me the fitting-room mirror pic."). No football framing in this one field. It is her sign-off and the last thing he reads.
- If the profile carries a northStar field (or the notes carry a "North star:" line), what he wants people to think when he walks in, it outranks everything stylistic: open the intro narrative from what HE wants people to think, let it settle close calls between items, and echo it in the final sign-off. NEVER print the words "north star" anywhere in the plan, use his actual words instead; the concept is internal machinery, not customer-facing language.
- If the profile carries an urgentEvent field (or the notes carry an "Urgent:" line), an event inside ~2 weeks, Phase 1 exists to win that event: only same-week-attainable pieces (in-stock + fast alterations, never made-to-measure lead times), and say plainly in that phase's goal what he should wear to the event itself, even if it's mostly clothes he already owns, dialed in by a tailor.
- Call submit_wardrobe_plan exactly once with the complete plan.

${PRICE_AND_TIMING_REALITY}
Use the reality tables above for every budget range, alterations reserve, lead time, and buy-timing call, they are your pricing ground truth for Houston; don't re-derive them.

${getHoustonClimateStyleBrief()}`;

const WARDROBE_ITEM_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string" },
    itemName: {
      type: "string",
      description:
        "Short shoppable name with color/fabric/type, MAX 6 words, NO counts (quantity is its own field), e.g. 'Navy tropical-wool MTM suit', 'White poplin dress shirts'. Shown in the timeline and store lists.",
    },
    description: { type: "string" },
    quantity: { type: "number" },
    estimatedBudgetLowUsd: { type: "number" },
    estimatedBudgetHighUsd: { type: "number" },
    priority: { type: "string", enum: ["essential", "recommended", "nice-to-have"] },
    recommendedStoreIds: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      description: "At least one vetted store id where this item should be bought, primary first, backup second.",
    },
    sayThis: {
      type: "string",
      description: "The exact opening line to say to the salesperson, in quotes-ready form. MAX 22 words.",
    },
    keySpecs: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 2,
      description: "1-2 fit/color specs that matter for THIS man. Each a short phrase, MAX 10 words.",
    },
    tip: {
      type: "string",
      description:
        "OPTIONAL: the single most valuable extra: a trap to refuse, a lead-time logistic, or a store fact. MAX 16 words. Omit when nothing clears the bar.",
    },
  },
  required: [
    "category",
    "itemName",
    "description",
    "quantity",
    "estimatedBudgetLowUsd",
    "estimatedBudgetHighUsd",
    "priority",
    "recommendedStoreIds",
    "sayThis",
    "keySpecs",
  ],
} as const;

const SUBMIT_PLAN_TOOL: Anthropic.Tool = {
  name: "submit_wardrobe_plan",
  description: "Submit the complete phased wardrobe plan.",
  input_schema: {
    type: "object",
    properties: {
      guideTitle: { type: "string", description: "A catchy title for this man's personal guide." },
      introNarrative: {
        type: "string",
        description: "His situation and the promise, personal and punchy. HARD MAX 90 words.",
      },
      climateNotes: {
        type: "string",
        description: "How Houston's climate specifically shapes this plan. HARD MAX 70 words.",
      },
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
      generalBuyingTips: {
        type: "array",
        items: { type: "string" },
        maxItems: 6,
        description: "At most 6 tips, each HARD MAX 20 words.",
      },
      finalPepTalk: {
        type: "string",
        description:
          "Kyla the stylist's personal sign-off, in her warm, bossy, funny voice: 3-4 sentences, HARD MAX 55 words. Her sharpest callback, one concrete first move, a confident send-off.",
      },
    },
    required: ["guideTitle", "introNarrative", "climateNotes", "phases", "budgetSummary", "generalBuyingTips", "finalPepTalk"],
  },
};

export async function buildWardrobePlan(args: {
  profile: StyleProfile;
  photoAssessment?: PhotoAssessment;
  scoutReports: ScoutReport[];
  /** Called with each phase name the moment Moon writes it — powers the live drafting ticker. */
  onPhaseName?: (name: string) => void;
}): Promise<WardrobePlan> {
  const { profile, photoAssessment, scoutReports, onPhaseName } = args;

  // Watches the tool call's JSON as it streams and surfaces phase names as
  // they appear. Phases are the only objects in the schema with a bare
  // "name" key (items use itemName, budget rows use phaseName), so a
  // simple scan is reliable — and purely cosmetic: the real plan still
  // comes from the finished, validated message.
  let draftBuffer = "";
  const seenNames = new Set<string>();
  // Phases ("name") and pieces ("itemName") both feed the live ticker —
  // the customer watches his actual plan assemble line by line.
  const nameRegex = /"(?:name|itemName)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  const watchDelta = (partialJson: string) => {
    if (!onPhaseName) return;
    draftBuffer += partialJson;
    nameRegex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = nameRegex.exec(draftBuffer)) !== null) {
      const name = m[1].replace(/\\"/g, '"');
      if (name && !seenNames.has(name)) {
        seenNames.add(name);
        onPhaseName(name);
      }
    }
  };
  const attachWatcher = (stream: { on: (ev: "streamEvent", cb: (e: Anthropic.MessageStreamEvent) => void) => unknown }) => {
    stream.on("streamEvent", (event) => {
      if (event.type === "content_block_delta" && event.delta.type === "input_json_delta") {
        watchDelta(event.delta.partial_json);
      }
    });
  };

  // The planner gets each vetted store's full profile — what it actually
  // carries, how buying there works, and its contact — so item-to-store
  // matching reflects real inventory, and the script fields can tell the man
  // exactly who to call and how to book. Directors sometimes vet the same
  // store from different categories; each store appears ONCE with the
  // experts' takes merged, which reads better and trims prefill tokens.
  const byId = new Map<string, Record<string, unknown> & { expertTake: string }>();
  for (const report of scoutReports) {
    for (const r of report.recommendations) {
      const existing = byId.get(r.store.id);
      if (existing) {
        existing.expertTake += ` ALSO: ${r.reason}`;
        continue;
      }
      byId.set(r.store.id, {
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
        contact: r.store.contact ?? "no phone listed, use its website",
        // Researched facts — brands he can ask for by name, real prices.
        brands: r.store.brands?.slice(0, 5),
        pricePoints: r.store.pricePoints?.slice(0, 3),
        insiderTake: r.store.insiderTake,
        expertTake: r.reason,
      });
    }
  }
  const vettedStores = Array.from(byId.values());

  const userMessage = `STYLE PROFILE:
${JSON.stringify(profile)}

PHOTO ASSESSMENT:
${photoAssessment ? JSON.stringify(photoAssessment) : "None provided, the man did not upload photos."}

VETTED STORE CANDIDATES (use ONLY these ids in recommendedStoreIds):
${JSON.stringify(vettedStores)}

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
    // Medium effort is the planner's biggest latency lever. It was tried
    // and reverted once when a live test produced phases summing to $3,560
    // against a $2,500 total — that exact failure is now caught by the
    // budget backstop in normalizeWardrobePlan and turned into an automatic
    // retry, so the fast path is the default and the math stays guaranteed.
    output_config: { effort: "medium" as const },
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
    attachWatcher(fastStream as unknown as { on: (ev: "streamEvent", cb: (e: Anthropic.MessageStreamEvent) => void) => unknown });
    response = (await fastStream.finalMessage()) as Anthropic.Message;
    console.log("[planner] fast mode");
  } catch (err) {
    console.warn(`[planner] fast mode unavailable (${(err as Error).message?.slice(0, 80)}), standard lane`);
    const stream = anthropic.messages.stream(baseParams);
    attachWatcher(stream);
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

  return repairVoice(normalizeWardrobePlan(toolUse.input, profile));
}


/**
 * The two fields a man reads first and last are the two where the voice
 * rules are absolute, and they were the two the model still slipped on in
 * roughly one run out of four. Regenerating the whole plan over one
 * sentence costs another minute; rewriting the offending field on the fast
 * model costs about a second, so the rule became enforceable rather than
 * merely stated.
 *
 * Every failure path keeps the original text. A plan that reads slightly
 * machine-made beats a plan with an empty intro.
 */
async function repairVoice(plan: WardrobePlan): Promise<WardrobePlan> {
  const targets: { key: "introNarrative" | "finalPepTalk"; label: string; maxWords: number; maxSentences?: number }[] = [
    { key: "introNarrative", label: "the plan's opening narrative", maxWords: 70 },
    { key: "finalPepTalk", label: "Kyla's sign-off, in her voice", maxWords: 45, maxSentences: 3 },
  ];

  await Promise.all(
    targets.map(async (t) => {
      const original = String((plan as unknown as Record<string, unknown>)[t.key] ?? "");
      const tells = findVoiceTells(original, { maxSentences: t.maxSentences });
      if (tells.length === 0) return;
      console.log(`[planner] repairing ${t.key}: ${tells.join("; ")}`);
      const startedAt = Date.now();

      try {
        const res = await anthropic.messages.create({
          model: FAST_AGENT_MODEL,
          max_tokens: 400,
          system: `You rewrite one short passage of menswear copy so it stops sounding machine-written. Keep every fact, name, number, and the writer's warmth exactly as they are. Change only the sentence construction. Reply with the rewritten passage and nothing else: no preamble, no quotation marks around it, no commentary.\n\n${HUMAN_VOICE_RULES}`,
          messages: [
            {
              role: "user",
              content: `This is ${t.label}. It has ${tells.length === 1 ? "a problem" : "problems"}: ${tells.join("; ")}.\n\nRewrite it under ${t.maxWords} words${t.maxSentences ? ` and in at most ${t.maxSentences} sentences` : ""}, fixing that and nothing else.\n\n${original}`,
            },
          ],
          output_config: { effort: "low" },
        } as Parameters<typeof anthropic.messages.create>[0]);

        const rewritten = sanitizeVoice(
          (res as Anthropic.Message).content
            .filter((b): b is Anthropic.TextBlock => b.type === "text")
            .map((b) => b.text)
            .join(" ")
            .trim(),
        );
        // Only accept a rewrite that actually cleared the tells and didn't
        // run away with the length. Otherwise the original stands.
        const stillBad = findVoiceTells(rewritten, { maxSentences: t.maxSentences });
        const words = rewritten.split(/\s+/).filter(Boolean).length;
        if (rewritten && stillBad.length === 0 && words <= t.maxWords + 10) {
          (plan as unknown as Record<string, unknown>)[t.key] = rewritten;
          console.log(`[planner] repaired ${t.key} in ${Date.now() - startedAt}ms`);
        } else {
          console.log(`[planner] repair rejected for ${t.key} (${stillBad.join("; ") || `${words} words`})`);
        }
      } catch (err) {
        console.warn(`[planner] voice repair failed for ${t.key}: ${(err as Error).message?.slice(0, 80)}`);
      }
    }),
  );
  return plan;
}

// The model occasionally emits a nested array/object field as a JSON
// *string* inside the tool input (seen live: phases arrived stringified,
// crashing the client's phases.map). Parse those back, then validate hard —
// a malformed plan must become a retryable error, never a stored plan.
function normalizeWardrobePlan(raw: unknown, profile?: StyleProfile): WardrobePlan {
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
    throw new Error("Wardrobe planner returned malformed phases, retry plan generation");
  }
  if ((plan.phases as unknown[]).some((p) => !p || typeof p !== "object" || !Array.isArray((p as any).items))) {
    throw new Error("Wardrobe planner returned a phase without a valid items array, retry plan generation");
  }

  // Budget arithmetic backstop: phases outsumming the stated total was the
  // one live failure that forced the planner onto max effort. Validating it
  // here (and letting generatePlanWithRetry regenerate) is what makes the
  // faster default effort safe — the failure mode became a retry, not a
  // shipped math error. Small float slack; $0-stretch phases are fine.
  const bs = plan.budgetSummary as { totalBudgetUsd?: unknown; perPhaseUsd?: unknown } | undefined;
  const total = Number(bs?.totalBudgetUsd);
  if (Array.isArray(bs?.perPhaseUsd) && Number.isFinite(total) && total > 0) {
    const phaseSum = (bs!.perPhaseUsd as { amountUsd?: unknown }[]).reduce(
      (sum, p) => sum + (Number(p?.amountUsd) || 0),
      0,
    );
    if (phaseSum > total + 1) {
      throw new Error(
        `Wardrobe planner budget error: phases sum to $${phaseSum} against a $${total} total, retry plan generation`,
      );
    }
  }

  // THE INSPECTOR — deterministic checks, no model calls. Anything caught
  // here becomes an automatic regenerate via generatePlanWithRetry instead
  // of a defect a customer sees.
  const allPhases = plan.phases as { name?: string; items?: Record<string, unknown>[] }[];
  const validIds = new Set(getAllStores().map((st) => st.id));
  const banned = (profile?.colorsToAvoid ?? [])
    .map((c) => String(c).trim().toLowerCase())
    .filter((c) => c.length > 2);
  for (const phase of allPhases) {
    for (const item of phase.items ?? []) {
      const ids = (item.recommendedStoreIds as string[]) ?? [];
      const unknownIds = ids.filter((id) => !validIds.has(id));
      if (unknownIds.length > 0) {
        throw new Error(`Plan referenced unknown store id(s) ${unknownIds.join(", ")}, retry plan generation`);
      }
      const nameText = String(item.itemName ?? "").toLowerCase();
      for (const color of banned) {
        if (new RegExp("\\b" + color + "\\b").test(nameText)) {
          throw new Error(
            'Plan put a banned color ("' + color + '") in item "' + item.itemName + '", retry plan generation',
          );
        }
      }
    }
  }
  // One-time budgets can't quietly grow: a plan totaling well beyond the
  // stated number is the "$400 became $1,600" failure, mechanically caught.
  if (profile && profile.budgetCadence === "one-time" && Number(profile.budgetTotalUsd) > 0) {
    const stated = Number(profile.budgetTotalUsd);
    const planTotal = Number((plan.budgetSummary as { totalBudgetUsd?: unknown })?.totalBudgetUsd) || 0;
    if (planTotal > stated * 1.1 + 25) {
      throw new Error(
        `Plan total $${planTotal} exceeds his stated one-time budget $${stated}, retry plan generation`,
      );
    }
  }

  // Last line of defence on the house voice: strip any em-dash that made
  // it past the prompt rules rather than paying a regenerate for it. The
  // count is logged because it's the honest measure of whether the prompt
  // rules are working or the sanitizer is quietly carrying them.
  const dashes = (JSON.stringify(plan).match(new RegExp(EM_DASH, "g")) ?? []).length;
  if (dashes > 0) console.log(`[planner] sanitized ${dashes} em-dash(es) out of the plan`);
  return sanitizeVoice(plan) as unknown as WardrobePlan;
}
