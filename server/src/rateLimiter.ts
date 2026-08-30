import rateLimit from "express-rate-limit";

// Every route wrapped with this calls the Claude API at least once per
// request — rate limit them so a leaked link or a stuck retry loop can't
// run up an unbounded bill. Cheap local reads (stores/session/health, and
// the plan-status poll endpoint) should NOT use this — see routes/plan.ts
// for why the poll endpoint deliberately skips it.
export const agentRouteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please wait a few minutes and try again." },
});
