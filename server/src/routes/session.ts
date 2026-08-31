import { Router } from "express";
import { requireSession } from "../sessionStore";

export const sessionRouter = Router();

sessionRouter.get("/:id", async (req, res) => {
  const session = await requireSession(req.params.id);
  res.json({
    id: session.id,
    interviewComplete: session.interviewComplete,
    styleProfile: session.styleProfile,
    photoAssessment: session.photoAssessment,
    wardrobePlan: session.wardrobePlan,
  });
});
