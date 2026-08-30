import { Router } from "express";
import { requireSession } from "../sessionStore";
import { generateWardrobePlan } from "../agents/orchestrator";
import { agentRouteLimiter } from "../rateLimiter";

export const planRouter = Router();

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
    generateWardrobePlan(session)
      .then(() => {
        session.planStatus = "done";
      })
      .catch((err) => {
        session.planStatus = "error";
        session.planError = err instanceof Error ? err.message : "Plan generation failed";
        console.error("Plan generation failed:", err);
      });

    res.status(202).json({ status: "generating" });
  } catch (err) {
    next(err);
  }
});

planRouter.get("/:sessionId", (req, res) => {
  const session = requireSession(req.params.sessionId);
  res.json({
    status: session.planStatus,
    plan: session.wardrobePlan,
    error: session.planError,
  });
});
