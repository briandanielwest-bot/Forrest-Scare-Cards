import type { SessionState, WardrobePlan } from "../types";
import { getHoustonClimateStyleBrief } from "./styleWeather";
import { runAllScouts } from "./storeScout";
import { buildWardrobePlan } from "./wardrobePlanner";

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

  // Scouts and photo analysis overlap — scouts only need the profile.
  const t0 = Date.now();
  const [scoutReports] = await Promise.all([
    runAllScouts(session.styleProfile, climateBrief),
    waitForPhotoAnalysis(session),
  ]);
  const tScouts = Date.now();
  console.log(`[orchestrator] scouts + photo wait: ${((tScouts - t0) / 1000).toFixed(1)}s`);

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
