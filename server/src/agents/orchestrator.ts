import type { SessionState, WardrobePlan } from "../types";
import { getHoustonClimateStyleBrief } from "./styleWeather";
import { runAllScouts, type ScoutReport } from "./storeScout";
import { buildWardrobePlan } from "./wardrobePlanner";

// Scouts only need the finished profile, which is final the moment the
// interview submits — so they start right then, while the user is still
// on the photo screen, instead of when he presses "build my plan". By
// generate time they're usually done, cutting their ~12s off the visible
// wait. Keyed off-session so types.ts stays free of agent imports.
const prewarmedScouts = new Map<string, Promise<ScoutReport[] | null>>();

export function prewarmScouts(session: SessionState): void {
  if (!session.styleProfile) return;
  const t0 = Date.now();
  const promise = runAllScouts(session.styleProfile, getHoustonClimateStyleBrief())
    .then((reports) => {
      console.log(`[orchestrator] scouts pre-warmed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      return reports;
    })
    .catch((err: Error) => {
      console.warn(`[orchestrator] scout pre-warm failed (${err.message?.slice(0, 80)}) — will rerun at plan time`);
      return null;
    });
  prewarmedScouts.set(session.id, promise);
}

/**
 * Runs the back half of the pipeline once the interview (and optionally the
 * photo analysis) is done: Store Scouts -> Wardrobe Planner -> plan.
 */
// Photo analysis runs in the background from the moment the upload lands
// (see routes/photo.ts) and usually finishes while the scouts work. Cap
// how long the planner will wait on a straggler; past that, the plan
// proceeds without the assessment rather than stalling the whole run.
const PHOTO_WAIT_MS = 150_000;

async function waitForPhotoAnalysis(session: SessionState): Promise<void> {
  const start = Date.now();
  while (session.photoStatus === "analyzing" && Date.now() - start < PHOTO_WAIT_MS) {
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (session.photoStatus === "analyzing") {
    console.warn("[orchestrator] photo analysis still running after wait cap — planning without it");
  }
}

export async function generateWardrobePlan(session: SessionState): Promise<WardrobePlan> {
  if (!session.styleProfile) {
    throw new Error("Cannot generate a plan before the interview has produced a style profile");
  }

  const climateBrief = getHoustonClimateStyleBrief();

  // Scouts and photo analysis overlap — scouts only need the profile,
  // and usually already ran via prewarmScouts at interview submit.
  session.planStage = "scouts";
  const t0 = Date.now();
  const prewarmed = prewarmedScouts.get(session.id);
  prewarmedScouts.delete(session.id);
  const [scoutReports] = await Promise.all([
    (async () => (prewarmed ? await prewarmed : null) ?? runAllScouts(session.styleProfile!, climateBrief))(),
    waitForPhotoAnalysis(session),
  ]);
  const tScouts = Date.now();
  console.log(`[orchestrator] scouts + photo wait: ${((tScouts - t0) / 1000).toFixed(1)}s`);

  session.planStage = "planner";
  const plan = await buildWardrobePlan({
    profile: session.styleProfile,
    photoAssessment: session.photoAssessment,
    climateBrief,
    scoutReports,
  });
  console.log(`[orchestrator] planner: ${((Date.now() - tScouts) / 1000).toFixed(1)}s`);

  session.wardrobePlan = plan;
  return plan;
}
