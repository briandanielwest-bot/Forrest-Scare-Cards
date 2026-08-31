import { Router } from "express";
import { requireSession, saveSession } from "../sessionStore";
import { generateWardrobePlan } from "../agents/orchestrator";
import { askAboutPlan } from "../agents/planQA";
import { buildOutfitMatrix } from "../agents/outfits";
import { agentRouteLimiter } from "../rateLimiter";
import { track } from "../analytics";
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
planRouter.post("/generate", agentRouteLimiter, async (req, res, next) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const session = await requireSession(sessionId);
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
    const t0 = Date.now();
    generatePlanWithRetry(session)
      .then(() => {
        session.planStatus = "done";
        const storeIds = Array.from(
          new Set(
            (session.wardrobePlan?.phases ?? []).flatMap((ph) =>
              (ph.items ?? []).flatMap((i) => i.recommendedStoreIds ?? []),
            ),
          ),
        );
        track("plan_generated", { seconds: Math.round((Date.now() - t0) / 1000), storeIds });
        saveSession(session);
      })
      .catch((err) => {
        session.planStatus = "error";
        const raw = err instanceof Error ? err.message : "Plan generation failed";
        session.planError = /credit balance is too low/i.test(raw)
          ? "Kyla's team is offline: the app's usage credits ran out. If this is your app, top up at console.anthropic.com (Plans & Billing)."
          : raw;
        track("plan_failed");
        console.error("Plan generation failed after retries:", err);
      });

    res.status(202).json({ status: "generating" });
  } catch (err) {
    next(err);
  }
});

// Post-plan Q&A with Kyla — short synchronous turns (~3-5s), rate limited
// like every other Claude-calling route.
planRouter.post("/ask", agentRouteLimiter, async (req, res, next) => {
  try {
    const { sessionId, question, purchasedKeys } = req.body as {
      sessionId?: string;
      question?: string;
      purchasedKeys?: string[];
    };
    if (!sessionId || !question?.trim()) {
      return res.status(400).json({ error: "sessionId and question are required" });
    }
    let session;
    try {
      session = await requireSession(sessionId);
    } catch {
      return res.status(404).json({ error: "This session has expired (the server restarted)" });
    }
    if (!session.wardrobePlan) {
      return res.status(409).json({ error: "No plan yet for this session" });
    }
    const reply = await askAboutPlan(
      session,
      question.trim().slice(0, 1000),
      Array.isArray(purchasedKeys) ? purchasedKeys.slice(0, 200) : [],
    );
    track("plan_question_asked");
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

// On-demand outfit matrix — one fast call, cached on the session.
planRouter.post("/outfits", agentRouteLimiter, async (req, res, next) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });
    let session;
    try {
      session = await requireSession(sessionId);
    } catch {
      return res.status(404).json({ error: "This session has expired (the server restarted)" });
    }
    if (!session.wardrobePlan) return res.status(409).json({ error: "No plan yet for this session" });
    const outfits = await buildOutfitMatrix(session);
    track("outfits_built", { count: outfits.length });
    res.json({ outfits });
  } catch (err) {
    next(err);
  }
});

planRouter.get("/:sessionId", async (req, res) => {
  let session;
  try {
    session = await requireSession(req.params.sessionId);
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
    stage: session.planStage,
    draftedPhases: session.draftedPhases,
    plan: session.wardrobePlan,
    error: session.planError,
  });
});
