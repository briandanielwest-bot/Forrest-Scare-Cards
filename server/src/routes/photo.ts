import { Router } from "express";
import multer from "multer";
import { requireSession } from "../sessionStore";
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

    const session = requireSession(sessionId);

    const images: UploadedImage[] = files.map((f) => ({
      mediaType: f.mimetype as UploadedImage["mediaType"],
      base64Data: f.buffer.toString("base64"),
    }));

    const assessment = await analyzePhotos(images, session.styleProfile);
    session.photoAssessment = assessment;

    res.json({ assessment });
  } catch (err) {
    next(err);
  }
});
