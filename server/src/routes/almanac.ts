import { Router } from "express";
import { askAlmanac } from "../agents/styleWeather";
import { track } from "../analytics";

export const almanacRouter = Router();

// One-off Houston style questions answered by Campbell — no session
// needed; the rate limiter is applied at mount (it's a Claude call).
almanacRouter.post("/ask", async (req, res, next) => {
  try {
    const { question } = req.body as { question?: string };
    if (!question?.trim()) {
      return res.status(400).json({ error: "question is required" });
    }
    const reply = await askAlmanac(question.trim().slice(0, 500));
    track("almanac_asked");
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});
