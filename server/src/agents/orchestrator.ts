import type { SessionState, WardrobePlan } from "../types";
import { getHoustonClimateStyleBrief } from "./styleWeather";
import { runAllScouts } from "./storeScout";
import { buildWardrobePlan } from "./wardrobePlanner";

/**
 * Runs the back half of the pipeline once the interview (and optionally the
 * photo analysis) is done: Store Scouts -> Wardrobe Planner -> plan.
 */
export async function generateWardrobePlan(session: SessionState): Promise<WardrobePlan> {
  if (!session.styleProfile) {
    throw new Error("Cannot generate a plan before the interview has produced a style profile");
  }

  const climateBrief = getHoustonClimateStyleBrief();
  const scoutReports = await runAllScouts(session.styleProfile, climateBrief);

  const plan = await buildWardrobePlan({
    profile: session.styleProfile,
    photoAssessment: session.photoAssessment,
    climateBrief,
    scoutReports,
  });

  session.wardrobePlan = plan;
  return plan;
}
