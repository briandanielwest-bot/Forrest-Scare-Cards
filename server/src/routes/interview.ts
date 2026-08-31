import { Router } from "express";
import { createSession, requireSession } from "../sessionStore";
import { continueInterview, continueInterviewStreaming, startInterview } from "../agents/interviewer";
import { prewarmScouts } from "../agents/orchestrator";
import { track } from "../analytics";

export const interviewRouter = Router();

interviewRouter.post("/start", async (_req, res, next) => {
  try {
    const session = createSession();
    track("interview_started");
    const result = await startInterview(session);
    res.json({ sessionId: session.id, reply: result.reply, done: result.done, quickReplies: result.quickReplies });
  } catch (err) {
    next(err);
  }
});

// Streaming variant: Kyla's words render as she writes them (SSE). The
// final event carries everything the non-streaming route returns; clients
// without stream support keep using POST /message unchanged.
interviewRouter.post("/message/stream", async (req, res) => {
  const { sessionId, message } = req.body as { sessionId?: string; message?: string };
  if (!sessionId || !message) {
    return res.status(400).json({ error: "sessionId and message are required" });
  }
  let session;
  try {
    session = requireSession(sessionId);
  } catch {
    return res.status(404).json({ error: "Session not found" });
  }
  if (session.interviewComplete) {
    return res.status(409).json({ error: "Interview already complete for this session" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  const send = (payload: unknown) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  try {
    const result = await continueInterviewStreaming(session, message, (delta) => send({ delta }));
    if (result.profile) {
      session.styleProfile = result.profile;
      session.interviewComplete = true;
      track("interview_completed", { budget: result.profile.budgetTotalUsd });
      prewarmScouts(session);
    }
    send({
      final: {
        reply: result.reply,
        done: result.done,
        profile: session.styleProfile,
        quickReplies: result.quickReplies,
      },
    });
  } catch (err) {
    console.error("Streaming interview turn failed:", err);
    send({ error: "Kyla's reply got interrupted — send that again?" });
  }
  res.end();
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
      track("interview_completed", { budget: result.profile.budgetTotalUsd });
      // Fire-and-forget: the buying team starts working the moment the
      // profile is final, while he's still on the photo screen.
      prewarmScouts(session);
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
