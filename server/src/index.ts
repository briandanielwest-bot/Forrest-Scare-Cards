import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import Anthropic from "@anthropic-ai/sdk";
import { PORT, CORS_ORIGIN } from "./config";
import { SessionNotFoundError } from "./sessionStore";
import { agentRouteLimiter } from "./rateLimiter";
import { interviewRouter } from "./routes/interview";
import { photoRouter } from "./routes/photo";
import { planRouter } from "./routes/plan";
import { storesRouter } from "./routes/stores";
import { sessionRouter } from "./routes/session";
import { almanacRouter } from "./routes/almanac";
import { memoryRouter } from "./routes/memory";
import { readStats } from "./analytics";

if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.warn(
    "WARNING: no ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN set — every agent call will fail until one is configured (see server/.env.example).",
  );
}

const app = express();

// Render (like most PaaS platforms) puts the app behind a reverse proxy,
// which sets X-Forwarded-For. Without this, express-rate-limit can't
// safely determine the real client IP and throws on every request.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Every route below calls the Claude API at least once per request — rate
// limit them so a leaked link or a stuck retry loop can't run up an
// unbounded bill. planRouter applies this limiter itself, only to its
// POST /generate handler — its GET status-poll route is a cheap local
// read (like stores/session/health below) that a client hits every few
// seconds for minutes while a plan builds, and sharing this budget with
// it would let normal polling alone lock a real user out mid-generation.
app.use("/api/interview", agentRouteLimiter, interviewRouter);
app.use("/api/photo", agentRouteLimiter, photoRouter);
app.use("/api/plan", planRouter);
app.use("/api/stores", storesRouter);
app.use("/api/session", sessionRouter);
app.use("/api/almanac", agentRouteLimiter, almanacRouter);
// No Claude calls in memory save/restore — cheap disk reads/writes.
app.use("/api/memory", memoryRouter);
// Aggregate funnel counts only (no per-user data) — the receipt book for
// store partnership conversations.
app.get("/api/stats", (_req, res) => res.json(readStats()));

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
