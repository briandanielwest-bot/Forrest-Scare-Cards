import { track } from "./analytics";

/**
 * What each request actually costs, and a ceiling so a shared link can't
 * drain the account.
 *
 * The business plan claims a plan runs $0.60-1.50 in API spend. Nothing
 * measured it, so that was a guess. Every response carries a usage block;
 * this records it, prices it, and totals it per day. Three credit
 * outages in one build is enough evidence that "we'll notice" is not a
 * strategy.
 *
 * Prices are USD per million tokens, standard published API rates. They
 * change, so every one is overridable from the environment: set
 * PRICE_OPUS_IN, PRICE_OPUS_OUT, PRICE_SONNET_IN, PRICE_SONNET_OUT.
 * Verify against console.anthropic.com before quoting these to anyone.
 */

const num = (key: string, fallback: number): number => {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

interface Rate {
  in: number;
  out: number;
}

const RATES: Record<string, Rate> = {
  opus: { in: num("PRICE_OPUS_IN", 15), out: num("PRICE_OPUS_OUT", 75) },
  sonnet: { in: num("PRICE_SONNET_IN", 3), out: num("PRICE_SONNET_OUT", 15) },
  haiku: { in: num("PRICE_HAIKU_IN", 1), out: num("PRICE_HAIKU_OUT", 5) },
};

// Cached input is far cheaper to read than fresh input and slightly more
// expensive to write. Prompt caching is the core latency strategy here, so
// pricing it correctly is most of the difference between a real number and
// a wrong one.
const CACHE_WRITE_MULTIPLIER = num("PRICE_CACHE_WRITE_MULT", 1.25);
const CACHE_READ_MULTIPLIER = num("PRICE_CACHE_READ_MULT", 0.1);

function rateFor(model: string): Rate {
  const m = model.toLowerCase();
  if (m.includes("opus")) return RATES.opus;
  if (m.includes("haiku")) return RATES.haiku;
  return RATES.sonnet;
}

/** The usage shape every Anthropic response carries. */
export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export function priceOf(model: string, usage: Usage | undefined): number {
  if (!usage) return 0;
  const r = rateFor(model);
  const fresh = usage.input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const out = usage.output_tokens ?? 0;
  return (
    (fresh * r.in +
      cacheWrite * r.in * CACHE_WRITE_MULTIPLIER +
      cacheRead * r.in * CACHE_READ_MULTIPLIER +
      out * r.out) /
    1_000_000
  );
}

interface DayLedger {
  day: string;
  totalUsd: number;
  calls: number;
  byLabel: Record<string, { usd: number; calls: number }>;
}

const today = (): string => new Date().toISOString().slice(0, 10);
let ledger: DayLedger = { day: today(), totalUsd: 0, calls: 0, byLabel: {} };

function rollIfNewDay(): void {
  const d = today();
  if (ledger.day !== d) ledger = { day: d, totalUsd: 0, calls: 0, byLabel: {} };
}

/**
 * Record one API call. `label` is the agent that made it ("planner",
 * "interviewer"), so spend can be attributed to the step that caused it
 * rather than to one undifferentiated bill.
 */
export function recordUsage(label: string, model: string, usage: Usage | undefined): number {
  rollIfNewDay();
  const usd = priceOf(model, usage);
  ledger.totalUsd += usd;
  ledger.calls += 1;
  const bucket = (ledger.byLabel[label] ??= { usd: 0, calls: 0 });
  bucket.usd += usd;
  bucket.calls += 1;
  return usd;
}

/**
 * Total for one user-facing operation, so "what does a plan cost" has an
 * answer. Call once when the operation finishes; the individual calls are
 * already in the daily ledger.
 */
export function recordOperation(operation: string, usd: number): void {
  track("api_cost", { operation, usd: Number(usd.toFixed(4)) });
}

export interface SpendSnapshot {
  day: string;
  totalUsd: number;
  calls: number;
  dailyLimitUsd: number | null;
  byLabel: Record<string, { usd: number; calls: number }>;
}

export function getSpend(): SpendSnapshot {
  rollIfNewDay();
  return {
    day: ledger.day,
    totalUsd: Number(ledger.totalUsd.toFixed(4)),
    calls: ledger.calls,
    dailyLimitUsd: DAILY_LIMIT_USD,
    byLabel: Object.fromEntries(
      Object.entries(ledger.byLabel).map(([k, v]) => [k, { usd: Number(v.usd.toFixed(4)), calls: v.calls }]),
    ),
  };
}

/**
 * The ceiling. Unset means no limit, which is the right default for local
 * development and the wrong one for a link shared into a group chat: set
 * DAILY_LIMIT_USD in the deployed environment.
 */
export const DAILY_LIMIT_USD: number | null = Number.isFinite(Number(process.env.DAILY_LIMIT_USD))
  ? Number(process.env.DAILY_LIMIT_USD)
  : null;

export function isOverDailyBudget(): boolean {
  if (DAILY_LIMIT_USD === null) return false;
  rollIfNewDay();
  return ledger.totalUsd >= DAILY_LIMIT_USD;
}

/**
 * Stopping at the ceiling has to read like the shop is closed for the day,
 * not like the app is broken. A man who hits this did nothing wrong.
 */
export const OVER_BUDGET_MESSAGE =
  "Kyla's booked solid for today. The team takes on a set number of plans a day so everyone gets real attention. Come back tomorrow and she'll pick this up.";
