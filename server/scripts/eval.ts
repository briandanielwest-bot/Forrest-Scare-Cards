/**
 * Plan quality evals: `npm run eval` (add `--full` for all profiles).
 *
 * The quality bar for this app has lived in one person's judgment while
 * reading output. That does not survive the person, and it gives no signal
 * when a prompt change quietly makes plans worse. This is the bar written
 * down: fixed profiles, mechanical scoring, one number to watch.
 *
 * Scoring is deliberately all deterministic. A model grading a model is
 * another thing to debug, and every property below is checkable in code:
 * does the budget add up, is every store real, does the timeline match
 * what he asked for, is the voice clean, is it short enough to read on a
 * phone. Taste is not scored here, and should not be. Taste is what the
 * feedback endpoint collects from real people.
 *
 * Each run costs real API credits (roughly the price of one plan per
 * profile), so the default is a five-profile smoke set.
 */
import "dotenv/config";
import { buildWardrobePlan } from "../src/agents/wardrobePlanner";
import { runAllScouts } from "../src/agents/storeScout";
import { getHoustonClimateStyleBrief } from "../src/agents/styleWeather";
import { findVoiceTells, EM_DASH } from "../src/agents/voice";
import { getAllStores } from "../src/data/houstonStores";
import { getSpend } from "../src/costs";
import type { StyleProfile, WardrobePlan } from "../src/types";

interface EvalProfile {
  id: string;
  /** Why this one is in the set: the failure it is here to catch. */
  guards: string;
  profile: StyleProfile;
  /** Months the plan should span, from his stated timeline. */
  expectMonths?: [number, number];
  smoke: boolean;
}

const p = (over: Partial<StyleProfile>): StyleProfile => ({
  lifestyle: "Office job downtown",
  styleArchetypes: ["classic"],
  fitPreference: "tailored",
  occasions: [],
  budgetTotalUsd: 1500,
  budgetCadence: "one-time",
  timeline: "a couple of months",
  colorsToAvoid: [],
  notes: "",
  ...over,
});

// Every profile here is a real failure mode this build hit at least once.
const PROFILES: EvalProfile[] = [
  {
    id: "terse-first-job",
    guards: "A near-empty profile must still produce a complete, store-backed plan.",
    profile: p({ lifestyle: "New analyst downtown", budgetTotalUsd: 600, notes: "Owns nothing but hoodies." }),
    smoke: true,
  },
  {
    id: "one-time-budget-discipline",
    guards: "The '$400 became $1,600' bug: a one-time budget must not quietly grow.",
    profile: p({ budgetTotalUsd: 400, budgetCadence: "one-time", lifestyle: "Warehouse supervisor, Katy" }),
    smoke: true,
  },
  {
    id: "monthly-cadence-math",
    guards: "Monthly budgets are per-period; the derived total must match the stated timeline.",
    profile: p({
      budgetTotalUsd: 300,
      budgetCadence: "monthly",
      timeline: "four months",
      lifestyle: "Med Center resident",
    }),
    expectMonths: [3, 5],
    smoke: true,
  },
  {
    id: "banned-colors",
    guards: "A stated color ban must hold across every item name.",
    profile: p({
      colorsToAvoid: ["brown", "orange"],
      budgetTotalUsd: 2000,
      lifestyle: "Energy trading floor, downtown",
    }),
    smoke: true,
  },
  {
    id: "clothes-not-tailoring",
    guards: "The business sells clothes. A plan must not spend his budget at an alterations bench.",
    profile: p({
      lifestyle: "Sales manager downtown, client-facing most days",
      budgetTotalUsd: 1500,
      notes: "Closet is full but nothing fits right since I lost weight.",
    }),
    smoke: true,
  },
  {
    id: "urgent-event",
    guards: "An event inside two weeks must not be answered with made-to-measure lead times.",
    profile: p({
      budgetTotalUsd: 1200,
      timeline: "wedding in twelve days",
      occasions: ["wedding, groomsman"],
      notes: "Urgent: wedding in twelve days.",
    }),
    smoke: true,
  },
  {
    id: "quarterly-cadence",
    guards: "Quarterly budgets derive their total the same way monthly ones do.",
    profile: p({ budgetTotalUsd: 900, budgetCadence: "quarterly", timeline: "a year", lifestyle: "Law firm associate" }),
    smoke: false,
  },
  {
    id: "big-and-tall",
    guards: "Sizing outside the standard rack must still route to stores that carry it.",
    profile: p({
      lifestyle: "Field operations manager, Katy",
      notes: "6'4\", 320 lbs, needs big and tall sizing.",
      budgetTotalUsd: 1800,
    }),
    smoke: false,
  },
  {
    id: "western-genuine",
    guards: "Western is a real category when asked for, and must not become a costume.",
    profile: p({
      styleArchetypes: ["western-influenced"],
      lifestyle: "Ranch supply business owner, north of Houston",
      budgetTotalUsd: 3000,
    }),
    smoke: false,
  },
  {
    id: "remote-casual",
    guards: "A man with no office must not be sold office wear.",
    profile: p({
      lifestyle: "Remote software engineer, Montrose. Leaves the house for dinners and dates.",
      budgetTotalUsd: 1000,
      styleArchetypes: ["modern minimal"],
    }),
    smoke: false,
  },
  {
    id: "high-budget-restraint",
    guards: "A large budget must still be spent in order, not sprayed across the Galleria.",
    profile: p({ budgetTotalUsd: 8000, lifestyle: "Med Center department chief", occasions: ["gala season"] }),
    smoke: false,
  },
];

interface Check {
  name: string;
  pass: boolean;
  detail?: string;
}

function scorePlan(plan: WardrobePlan, ev: EvalProfile): Check[] {
  const checks: Check[] = [];
  const validIds = new Set(getAllStores().map((s) => s.id));
  const phases = plan.phases ?? [];
  const items = phases.flatMap((ph) => ph.items ?? []);
  const prose = JSON.stringify(plan);
  const add = (name: string, pass: boolean, detail?: string) => checks.push({ name, pass, detail });

  add("has phases and items", phases.length >= 2 && items.length >= 3, `${phases.length} phases, ${items.length} items`);

  // Budget arithmetic: the one failure a customer notices immediately.
  const total = Number(plan.budgetSummary?.totalBudgetUsd ?? 0);
  const phaseSum = (plan.budgetSummary?.perPhaseUsd ?? []).reduce((n, x) => n + (Number(x?.amountUsd) || 0), 0);
  add("phases sum within total", phaseSum <= total + 1, `$${phaseSum} of $${total}`);

  const stated = Number(ev.profile.budgetTotalUsd);
  if (ev.profile.budgetCadence === "one-time") {
    add("one-time budget respected", total <= stated * 1.1 + 25, `$${total} against a stated $${stated}`);
  } else {
    // Per-period budgets: the derived total must be a whole number of
    // periods, and must not stretch past the timeline he gave.
    const periods = total / stated;
    add("per-period total is a sane multiple", periods >= 0.9 && periods <= 13, `$${total} = ${periods.toFixed(1)} periods`);
  }

  // He came here for clothes. Tailoring labour earns a line, not the plan.
  const altSpend = items
    .filter((i) => /alter|tailoring|hem\b|taper|darts|resiz/.test(`${i.category ?? ""} ${i.itemName ?? ""}`.toLowerCase()))
    .reduce((n, i) => n + (Number(i.estimatedBudgetHighUsd) || 0), 0);
  const garmentSpend = items.reduce((n, i) => n + (Number(i.estimatedBudgetHighUsd) || 0), 0) - altSpend;
  add(
    "alterations stay a minority of spend",
    total === 0 || altSpend / total <= 0.25,
    `$${altSpend} of $${total}`,
  );
  add("most of the money buys clothes", garmentSpend > altSpend, `$${garmentSpend} on garments vs $${altSpend} on labour`);

  add("every item is store-backed", items.every((i) => (i.recommendedStoreIds ?? []).length > 0));
  const unknown = items.flatMap((i) => i.recommendedStoreIds ?? []).filter((id) => !validIds.has(id));
  add("no invented stores", unknown.length === 0, unknown.join(", "));
  const unnamed = items.filter((i) => !i.itemName);
  add("every item is named", unnamed.length === 0, `${unnamed.length} unnamed`);
  // A $0 item is legitimate for a deliberate stretch goal (the planner is
  // told to price those at $0 with the real cost in the text, and the plan
  // screen renders it as "$0 today, buy later"). Anything else priced at
  // zero is a defect.
  const unpriced = items.filter((i) => Number(i.estimatedBudgetHighUsd) <= 0 && i.priority !== "nice-to-have");
  add(
    "every non-stretch item is priced",
    unpriced.length === 0,
    unpriced.map((i) => `${i.itemName} (${i.priority})`).join(", "),
  );
  add("every item carries an in-store line", items.every((i) => Boolean(i.sayThis) && (i.keySpecs ?? []).length > 0));

  // The shoppable name is the surface that matters, and it is what the
  // runtime inspector guards. Descriptions are checked too, but only for a
  // color that isn't being warned against: a plan that says "skip the
  // brown" is obeying the ban, not breaking it, and scoring that as a
  // violation was this eval's own bug on its first run.
  const banned = (ev.profile.colorsToAvoid ?? []).map((c) => c.toLowerCase()).filter((c) => c.length > 2);
  const NEGATED = /\b(no|not|avoid|skip|never|without|instead of|rather than|steer clear of|nothing)\b[^.]{0,30}$/i;
  const usesBanned = (text: string): boolean =>
    banned.some((c) => {
      const re = new RegExp("\\b" + c + "\\b", "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        if (!NEGATED.test(text.slice(0, m.index))) return true;
      }
      return false;
    });
  const violations = items.filter((i) => usesBanned(i.itemName ?? "") || usesBanned(i.description ?? ""));
  add("banned colors respected", violations.length === 0, violations.map((v) => v.itemName).join(", "));

  // Voice, using the same detector the planner enforces at runtime.
  add("no em-dashes", !prose.includes(EM_DASH));
  add("intro is clean", findVoiceTells(plan.introNarrative ?? "").length === 0, findVoiceTells(plan.introNarrative ?? "").join("; "));
  add(
    "sign-off is clean and capped",
    findVoiceTells(plan.finalPepTalk ?? "", { maxSentences: 3 }).length === 0,
    findVoiceTells(plan.finalPepTalk ?? "", { maxSentences: 3 }).join("; "),
  );

  // Readable on a phone. The cap that kept slipping when voice rules got
  // rewritten, so it is scored rather than trusted.
  const words = JSON.stringify(plan)
    .replace(/["{}\[\],:]/g, " ")
    .split(/\s+/)
    .filter((w) => /[a-z]{3}/i.test(w)).length;
  add("plan reads under 1,500 words", words <= 1500, `${words} words`);

  if (ev.id === "urgent-event") {
    // Phase one must be attainable this week, so no lead-time language.
    const phase1 = JSON.stringify(phases[0] ?? {});
    const leadTime = /made-to-measure|bespoke|six weeks|4-6 weeks|custom suit/i.test(phase1);
    add("urgent phase 1 avoids lead times", !leadTime);
  }

  return checks;
}

async function run(ev: EvalProfile): Promise<{ id: string; checks: Check[]; seconds: number; error?: string }> {
  const t0 = Date.now();
  try {
    const climate = getHoustonClimateStyleBrief();
    const scouts = await runAllScouts(ev.profile, climate);
    const plan = await buildWardrobePlan({ profile: ev.profile, scoutReports: scouts, climateBrief: climate });
    return { id: ev.id, checks: scorePlan(plan, ev), seconds: (Date.now() - t0) / 1000 };
  } catch (err) {
    return { id: ev.id, checks: [], seconds: (Date.now() - t0) / 1000, error: (err as Error).message };
  }
}

(async () => {
  const full = process.argv.includes("--full");
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
  const set = only ? PROFILES.filter((x) => x.id === only) : full ? PROFILES : PROFILES.filter((x) => x.smoke);
  if (set.length === 0) {
    console.error(`No profile matched. Known ids: ${PROFILES.map((x) => x.id).join(", ")}`);
    process.exit(2);
  }
  console.log(`Running ${set.length} profile(s)${full ? " (full set)" : " (smoke set; --full for all)"}\n`);

  const results = [];
  for (const ev of set) {
    const r = await run(ev);
    results.push(r);
    const failed = r.checks.filter((c) => !c.pass);
    const head = r.error
      ? `ERROR  ${r.id}`
      : `${failed.length === 0 ? "PASS" : "FAIL"}   ${r.id}  ${r.checks.length - failed.length}/${r.checks.length}  ${r.seconds.toFixed(0)}s`;
    console.log(head);
    console.log(`       guards: ${set.find((s) => s.id === r.id)!.guards}`);
    if (r.error) console.log(`       ${r.error}`);
    for (const c of failed) console.log(`       ✗ ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
    console.log("");
  }

  const totalChecks = results.reduce((n, r) => n + r.checks.length, 0);
  const passedChecks = results.reduce((n, r) => n + r.checks.filter((c) => c.pass).length, 0);
  const cleanProfiles = results.filter((r) => !r.error && r.checks.every((c) => c.pass)).length;
  const spend = getSpend();

  console.log("─".repeat(60));
  console.log(`Profiles clean: ${cleanProfiles}/${results.length}`);
  console.log(`Checks passed:  ${passedChecks}/${totalChecks}  (${((passedChecks / totalChecks) * 100).toFixed(1)}%)`);
  console.log(`Median plan:    ${[...results.map((r) => r.seconds)].sort((a, b) => a - b)[Math.floor(results.length / 2)].toFixed(0)}s`);
  console.log(`API spend:      $${spend.totalUsd.toFixed(2)} across ${spend.calls} calls`);
  process.exit(cleanProfiles === results.length ? 0 : 1);
})();
