import { Router } from "express";
import { loadMemoryRecord, saveMemoryRecord } from "../memoryStore";
import { createSession, requireSession, saveSession } from "../sessionStore";
import type { StyleProfile, WardrobePlan } from "../types";
import { track } from "../analytics";

export const memoryRouter = Router();

// Save the current session's profile + plan under a claim code (or update
// an existing code). Purchased keys come from the client, which owns
// check-off state.
memoryRouter.post("/save", async (req, res, next) => {
  try {
    const { sessionId, purchasedKeys, existingCode } = req.body as {
      sessionId?: string;
      purchasedKeys?: string[];
      existingCode?: string;
    };
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });
    let session;
    try {
      session = await requireSession(sessionId);
    } catch {
      return res.status(404).json({ error: "This session has expired. The plan on your screen can still be copied." });
    }
    if (!session.wardrobePlan) return res.status(409).json({ error: "Nothing to save yet. Finish a plan first." });
    const record = await saveMemoryRecord({
      styleProfile: session.styleProfile ?? null,
      wardrobePlan: session.wardrobePlan,
      purchasedKeys: Array.isArray(purchasedKeys) ? purchasedKeys.slice(0, 200) : [],
      existingCode: typeof existingCode === "string" ? existingCode : undefined,
      photoAssessment: session.photoAssessment,
      planQAHistory: session.planQAHistory,
      outfits: session.outfits,
    });
    track("plan_saved");
    res.json({ code: record.code });
  } catch (err) {
    next(err);
  }
});

// Restore a saved plan into a brand-new session so everything works again
// on this device — including Kyla's plan chat.
memoryRouter.post("/restore", async (req, res, next) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code?.trim()) return res.status(400).json({ error: "code is required" });
    const record = await loadMemoryRecord(code);
    if (!record || !record.wardrobePlan) {
      return res.status(404).json({ error: "No saved plan under that code. Check the dashes and try again." });
    }
    const session = createSession();
    session.styleProfile = (record.styleProfile ?? undefined) as StyleProfile | undefined;
    session.wardrobePlan = record.wardrobePlan as WardrobePlan;
    session.interviewComplete = true;
    session.planStatus = "done";
    // Rehydrate the whole dossier: Kyla remembers the chat they already
    // had, his photo read, and the outfit matrix.
    session.photoAssessment = record.photoAssessment;
    session.planQAHistory = record.planQAHistory;
    session.outfits = record.outfits;
    saveSession(session);
    track("plan_restored");
    res.json({
      sessionId: session.id,
      profile: record.styleProfile,
      plan: record.wardrobePlan,
      purchasedKeys: record.purchasedKeys ?? [],
      code: record.code,
    });
  } catch (err) {
    next(err);
  }
});
