import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { PORT, CORS_ORIGIN } from "./config";
import { SessionNotFoundError } from "./sessionStore";
import { interviewRouter } from "./routes/interview";
import { photoRouter } from "./routes/photo";
import { planRouter } from "./routes/plan";
import { storesRouter } from "./routes/stores";
import { sessionRouter } from "./routes/session";

const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/interview", interviewRouter);
app.use("/api/photo", photoRouter);
app.use("/api/plan", planRouter);
app.use("/api/stores", storesRouter);
app.use("/api/session", sessionRouter);

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SessionNotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("Anthropic auth error:", err.message);
    return res.status(500).json({ error: "Server is missing a valid ANTHROPIC_API_KEY" });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return res.status(429).json({ error: "Rate limited by the Claude API — try again shortly" });
  }
  if (err instanceof Anthropic.APIError) {
    console.error("Anthropic API error:", err.status, err.message);
    return res.status(502).json({ error: "Upstream AI request failed" });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Bayou & Blazer server listening on http://localhost:${PORT}`);
});
