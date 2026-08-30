import { Router } from "express";
import { createSession, requireSession } from "../sessionStore";
import { continueInterview, startInterview } from "../agents/interviewer";

export const interviewRouter = Router();

interviewRouter.post("/start", async (_req, res, next) => {
  try {
    const session = createSession();
    const result = await startInterview(session);
    res.json({ sessionId: session.id, reply: result.reply, done: result.done, quickReplies: result.quickReplies });
  } catch (err) {
    next(err);
  }
});

interviewRouter.post("/message", async (req, res, next) => {
  try {
    const { sessionId, message } = req.body as { sessionId?: string; message?: string };
    if (!sessionId || !message) {
      return res.status(400).json({ error: "sessionId and message are required" });
    }

    const session = requireSession(sessionId);
    if (session.interviewComplete) {
      return res.status(409).json({ error: "Interview already complete for this session" });
    }

    const result = await continueInterview(session, message);
    if (result.profile) {
      session.styleProfile = result.profile;
      session.interviewComplete = true;
    }

    res.json({
      reply: result.reply,
      done: result.done,
      profile: session.styleProfile,
      quickReplies: result.quickReplies,
    });
  } catch (err) {
    next(err);
  }
});
