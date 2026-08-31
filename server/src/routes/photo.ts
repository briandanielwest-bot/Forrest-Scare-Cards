import { Router } from "express";
import multer from "multer";
import { requireSession, saveSession } from "../sessionStore";
import { analyzePhotos } from "../agents/photoAnalyst";
import type { UploadedImage } from "../types";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported image type: ${file.mimetype}`));
    }
  },
});

export const photoRouter = Router();

photoRouter.post("/analyze", upload.array("photos", 12), async (req, res, next) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };
    const files = req.files as Express.Multer.File[] | undefined;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "At least one photo is required" });
    }

    const session = await requireSession(sessionId);

    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    console.log(`[photo] ${files.length} file(s), ${(totalBytes / 1024).toFixed(0)} KB total — analyzing in background`);

    const images: UploadedImage[] = files.map((f) => ({
      mediaType: f.mimetype as UploadedImage["mediaType"],
      base64Data: f.buffer.toString("base64"),
    }));

    // Fire-and-forget, same pattern as plan generation: holding this
    // request open for the 30-90s analysis was the last long-lived HTTP
    // call in the app, and it died on host request timeouts and flaky
    // mobile connections. The client moves on immediately; plan
    // generation waits for (or proceeds without) the assessment.
    session.photoStatus = "analyzing";
    const startedAt = Date.now();
    analyzePhotos(images, session.styleProfile)
      .then((assessment) => {
        session.photoAssessment = assessment;
        session.photoStatus = "done";
        saveSession(session);
        console.log(`[photo] analysis done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
      })
      .catch((err) => {
        // Non-fatal by design: the plan still generates without the
        // assessment rather than dead-ending the whole run.
        session.photoStatus = "error";
        console.error("[photo] analysis failed (plan will proceed without it):", err);
      });

    res.status(202).json({ status: "analyzing" });
  } catch (err) {
    next(err);
  }
});
