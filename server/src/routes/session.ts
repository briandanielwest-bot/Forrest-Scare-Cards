import { Router } from "express";
import { requireSession } from "../sessionStore";

export const sessionRouter = Router();

// The try/catch is load-bearing, not decoration. Express 4 does not forward
// a rejected promise from an async handler to the error middleware, so an
// unknown id used to reject unhandled, and Node treats an unhandled
// rejection as a fatal error: one GET with a made-up session id killed the
// whole server. Reproduced against a running instance before this was
// written. Every async handler in this app therefore ends in next(err).
sessionRouter.get("/:id", async (req, res, next) => {
  try {
    const session = await requireSession(req.params.id);
    res.json({
      id: session.id,
      interviewComplete: session.interviewComplete,
      styleProfile: session.styleProfile,
      photoAssessment: session.photoAssessment,
      wardrobePlan: session.wardrobePlan,
    });
  } catch (err) {
    next(err);
  }
});
