/**
 * Plan envelope check: `npm run plan:check`
 *
 * The planner's tool input has arrived malformed in live runs, and each
 * shape below cost a real user a full regenerate (about a minute) before
 * normalizeWardrobePlan learned to recover it. These are shapes that
 * actually happened, so a regression here means we start paying that
 * minute again.
 */
import { normalizeWardrobePlan as __testNormalize } from "../src/agents/wardrobePlanner";
const broken = {
  $PARAMETER_NAME: [
    { name: "Fix What's Boxy", timingLabel: "Weeks 1-2", goal: "Tailor what you own", items: [
      { category: "tailoring", itemName: "Jacket alterations", description: "Take in the waist", quantity: 1,
        estimatedBudgetLowUsd: 100, estimatedBudgetHighUsd: 200, priority: "essential",
        recommendedStoreIds: ["qc-tailors"], sayThis: "Take these in through the body", keySpecs: ["close, not tight"] },
    ] },
  ],
  phases: undefined,
  generalBuyingTips: ["Buy the navy first"],
  budgetSummary: { totalBudgetUsd: 2000, perPhaseUsd: [{ phaseName: "Fix What's Boxy", amountUsd: 200 }] },
};
const goodPhases = broken.$PARAMETER_NAME;
const CASES: { note: string; raw: Record<string, unknown> }[] = [
  { note: "phases parked under a junk key (seen live as $PARAMETER_NAME)", raw: broken },
  {
    note: "phases arrived as a JSON string",
    raw: { phases: JSON.stringify(goodPhases), generalBuyingTips: broken.generalBuyingTips, budgetSummary: broken.budgetSummary },
  },
  {
    note: "items arrived as a JSON string inside a phase",
    raw: {
      phases: [{ ...goodPhases[0], items: JSON.stringify(goodPhases[0].items) }],
      generalBuyingTips: broken.generalBuyingTips,
      budgetSummary: broken.budgetSummary,
    },
  },
  {
    note: "budgetSummary and its perPhaseUsd both arrived stringified",
    raw: {
      phases: goodPhases,
      generalBuyingTips: broken.generalBuyingTips,
      budgetSummary: JSON.stringify(broken.budgetSummary),
    },
  },
];

let failures = 0;
for (const c of CASES) {
  try {
    const plan = __testNormalize(c.raw, undefined);
    const ok =
      Array.isArray(plan.phases) &&
      plan.phases.length === 1 &&
      Array.isArray(plan.phases[0].items) &&
      plan.phases[0].items.length === 1 &&
      !("$PARAMETER_NAME" in (plan as object));
    if (!ok) failures++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${c.note}`);
  } catch (e) {
    failures++;
    console.log(`  FAIL  ${c.note} (${(e as Error).message})`);
  }
}
console.log(failures === 0 ? "\nAll plan shape checks passed." : `\n${failures} plan shape check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
