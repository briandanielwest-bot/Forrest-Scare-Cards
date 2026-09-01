import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import Anthropic from "@anthropic-ai/sdk";
import { PORT, CORS_ORIGIN } from "./config";
import { SessionNotFoundError } from "./sessionStore";
import { agentRouteLimiter } from "./rateLimiter";
import { getSpend, isOverDailyBudget, OVER_BUDGET_MESSAGE } from "./costs";
import { interviewRouter } from "./routes/interview";
import { photoRouter } from "./routes/photo";
import { planRouter } from "./routes/plan";
import { storesRouter } from "./routes/stores";
import { sessionRouter } from "./routes/session";
import { almanacRouter } from "./routes/almanac";
import { memoryRouter } from "./routes/memory";
import { readStats } from "./analytics";
import { initDb, pruneOldSessions } from "./db";

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
// The spend ceiling, in front of every route that calls Claude. A rate
// limiter caps how fast one person can spend; this caps how much everyone
// can spend in a day, which is the failure a shared link actually causes.
// Unset DAILY_LIMIT_USD means no ceiling (right for local, wrong for a
// link in a group chat).
function spendGuard(_req: Request, res: Response, next: NextFunction): void {
  if (isOverDailyBudget()) {
    res.status(503).json({ error: OVER_BUDGET_MESSAGE });
    return;
  }
  next();
}

app.use("/api/interview", spendGuard, agentRouteLimiter, interviewRouter);
app.use("/api/photo", spendGuard, agentRouteLimiter, photoRouter);
app.use("/api/plan", planRouter);
app.use("/api/stores", storesRouter);
app.use("/api/session", sessionRouter);
app.use("/api/almanac", spendGuard, agentRouteLimiter, almanacRouter);
// No Claude calls in memory save/restore — cheap disk reads/writes.
app.use("/api/memory", memoryRouter);
// Aggregate funnel counts only (no per-user data) — the receipt book for
// store partnership conversations.
app.get("/api/stats", (_req, res) => res.json({ ...readStats(), spend: getSpend() }));

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
    // An exhausted credit balance arrives as a generic 400 whose only
    // clue is the message text. Calling it out by name turns a baffling
    // outage into a two-minute fix, for the operator and the user alike.
    if (/credit balance is too low/i.test(err.message)) {
      console.error(
        "\n*** ANTHROPIC CREDITS EXHAUSTED — the app cannot generate plans until you add credits at\n" +
          "*** https://console.anthropic.com → Plans & Billing\n",
      );
      return res.status(503).json({
        error:
          "Kyla's team is offline: the app's usage credits ran out. If this is your app, top up at console.anthropic.com (Plans & Billing) and it comes right back.",
      });
    }
    return res.status(502).json({ error: "Kyla's team is offline for a moment. Try that again?" });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, async () => {
  console.log(`Bayou & Blazer server listening on http://localhost:${PORT}`);
  // Storage comes up after the port so a database hiccup can never stop
  // the app from serving — it just falls back to memory and disk.
  await initDb();
  void pruneOldSessions();
  setInterval(() => void pruneOldSessions(), 6 * 60 * 60 * 1000);
});
