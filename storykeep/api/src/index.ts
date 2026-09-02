import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { CORS_ORIGIN, IS_PROD, PORT, SESSION_SECRET_IS_EPHEMERAL, PAYMENTS_ENABLED } from "./config";
import { BRAND } from "./brand";
import { migrate, pool } from "./lib/db";
import { attachUser } from "./lib/auth";
import { SpendLimitReached, spendSummary } from "./lib/spend";
import { AgentRefusal } from "./lib/claude";
import { authRouter } from "./routes/auth";
import { booksRouter } from "./routes/books";
import { interviewRouter } from "./routes/interview";
import { writeRouter } from "./routes/write";
import { artRouter } from "./routes/art";
import { exportRouter } from "./routes/exports";
import { handleStripeWebhook, ordersRouter } from "./routes/orders";
import { imagesEnabled } from "./lib/images";

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// The web app and the API are on different hosts, so credentialed CORS is
// required and the origin must be named exactly — `*` is rejected by browsers
// the moment credentials are involved.
app.use(
  cors({
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  }),
);

// Mounted before express.json(), because Stripe signs the raw bytes.
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      await handleStripeWebhook(req.body as Buffer, String(req.headers["stripe-signature"] ?? ""));
      res.json({ received: true });
    } catch (err) {
      console.error("[stripe] webhook rejected", err);
      res.status(400).json({ error: "Invalid signature." });
    }
  },
);

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(attachUser);

/**
 * Two limiters, because the two kinds of request fail differently.
 *
 * Auth is limited tightly against credential stuffing. Agent routes are
 * limited because each one spends real money — but generously, because a
 * person in the middle of a two-hour interview about their late wife must
 * never be told to slow down.
 */
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false });
const agentLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 240, standardHeaders: true, legacyHeaders: false });

app.get("/api/health", async (_req, res) => {
  let storage: "postgres" | "unavailable" = "unavailable";
  try {
    if (pool) {
      await pool.query("SELECT 1");
      storage = "postgres";
    }
  } catch {
    storage = "unavailable";
  }
  const spend = storage === "postgres" ? await spendSummary().catch(() => null) : null;
  res.json({
    ok: storage === "postgres",
    brand: BRAND.name,
    storage,
    payments: PAYMENTS_ENABLED ? "stripe" : "off",
    illustration: imagesEnabled() ? "on" : "briefs-only",
    spend,
  });
});

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/books", agentLimiter, booksRouter);
app.use("/api/books/:bookId/interviews", agentLimiter, interviewRouter);
app.use("/api/books/:bookId", agentLimiter, writeRouter);
app.use("/api/books/:bookId/art", agentLimiter, artRouter);
app.use("/api/books/:bookId/export", agentLimiter, exportRouter);
app.use("/api/books/:bookId/orders", ordersRouter);

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

/**
 * One error handler, because every one of these ends up in front of a person
 * who is not a programmer and who may be upset about the subject matter.
 */
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ): void => {
    if (err instanceof SpendLimitReached) {
      res.status(429).json({ error: err.message });
      return;
    }
    if (err instanceof AgentRefusal) {
      res.status(422).json({ error: err.message });
      return;
    }
    console.error("[error]", err);
    res.status(500).json({
      error: "Something went wrong on our side. Your work is saved — try that again in a moment.",
    });
  },
);

async function start(): Promise<void> {
  if (!pool) {
    console.error(
      "\nDATABASE_URL is not set. Storykeep stores people's life stories and will not run without real storage.\n" +
        "  docker run --name storykeep-db -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:16\n" +
        "  export DATABASE_URL=postgres://postgres:dev@localhost:5432/postgres\n",
    );
    process.exit(1);
  }

  await migrate();

  if (IS_PROD && SESSION_SECRET_IS_EPHEMERAL) {
    console.warn(
      "[auth] SESSION_SECRET is unset, so a random one was generated. Every deploy will sign " +
        "everyone out. Set it in the environment.",
    );
  }

  app.listen(PORT, () => {
    console.log(`${BRAND.name} API listening on :${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start", err);
  process.exit(1);
});
