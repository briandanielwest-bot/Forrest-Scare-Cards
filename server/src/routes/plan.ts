import { Router } from "express";
import { requireSession } from "../sessionStore";
import { generateWardrobePlan } from "../agents/orchestrator";

export const planRouter = Router();

planRouter.post("/generate", async (req, res, next) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const session = requireSession(sessionId);
    if (!session.styleProfile) {
      return res.status(409).json({ error: "Finish the interview before generating a plan" });
    }

    const plan = await generateWardrobePlan(session);
    res.json({ plan });
  } catch (err) {
    next(err);
  }
});

planRouter.get("/:sessionId", (req, res) => {
  const session = requireSession(req.params.sessionId);
  if (!session.wardrobePlan) {
    return res.status(404).json({ error: "No plan generated yet for this session" });
  }
  res.json({ plan: session.wardrobePlan });
});
