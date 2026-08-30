import { Router } from "express";
import { requireSession } from "../sessionStore";
import { generateWardrobePlan } from "../agents/orchestrator";
import { agentRouteLimiter } from "../rateLimiter";
import type { SessionState } from "../types";

export const planRouter = Router();

// One transparent retry before surfacing an error to the phone: the flaky
// failure modes seen live (a truncated or malformed planner response) are
// per-attempt model behavior, not per-profile — a second attempt almost
// always lands, and it's far better UX than making the user tap retry.
async function generatePlanWithRetry(session: SessionState): Promise<void> {
  const MAX_ATTEMPTS = 2;
  for (let attempt = 1; ; attempt++) {
    try {
      await generateWardrobePlan(session);
      return;
    } catch (err) {
      console.error(`Plan generation attempt ${attempt}/${MAX_ATTEMPTS} failed:`, err);
      if (attempt >= MAX_ATTEMPTS) throw err;
    }
  }
}

// Only this route actually calls Claude — the GET status poll below is a
// cheap in-memory read a client hits every few seconds for minutes while a
// plan builds, so it deliberately stays outside this limiter.
planRouter.post("/generate", agentRouteLimiter, (req, res, next) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const session = requireSession(sessionId);
    if (!session.styleProfile) {
      return res.status(409).json({ error: "Finish the interview before generating a plan" });
    }
    if (session.planStatus === "generating") {
      return res.status(202).json({ status: "generating" });
    }

    // Fire-and-forget: the four store scouts plus the wardrobe planner
    // together can take over a minute, which is longer than some hosts'
    // single-request timeout. Kick the work off in the background and let
    // the client poll GET /:sessionId for status instead of holding one
    // long-lived request open.
    session.planStatus = "generating";
    session.planError = undefined;
    generatePlanWithRetry(session)
      .then(() => {
        session.planStatus = "done";
      })
      .catch((err) => {
        session.planStatus = "error";
        session.planError = err instanceof Error ? err.message : "Plan generation failed";
        console.error("Plan generation failed after retries:", err);
      });

    res.status(202).json({ status: "generating" });
  } catch (err) {
    next(err);
  }
});

planRouter.get("/:sessionId", (req, res) => {
  let session;
  try {
    session = requireSession(req.params.sessionId);
  } catch {
    // Sessions live in memory, so a server restart mid-generation (e.g. a
    // deploy) loses them. Tell the truth in a way the phone can display,
    // instead of a bare 404 that reads as "lost connection".
    return res.json({
      status: "error",
      error: "The server restarted and lost this session — head back and start a new plan. Sorry about that!",
    });
  }
  res.json({
    status: session.planStatus,
    plan: session.wardrobePlan,
    error: session.planError,
  });
});
