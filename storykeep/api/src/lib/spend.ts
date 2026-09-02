import { DAILY_LIMIT_USD, USER_MONTHLY_LIMIT_USD } from "../config";
import { id, one, query } from "./db";

/**
 * What each call actually costs, and two ceilings so that neither a bug nor
 * an enthusiastic author can drain the account.
 *
 * Rates are USD per million tokens at published Claude API prices, and every
 * one is overridable from the environment because prices change and a
 * hardcoded number becomes a lie without announcing itself.
 */
const rate = (key: string, fallback: number): number => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

interface Rate {
  in: number;
  out: number;
}

const RATES: Record<string, Rate> = {
  opus: { in: rate("PRICE_OPUS_IN", 5), out: rate("PRICE_OPUS_OUT", 25) },
  sonnet: { in: rate("PRICE_SONNET_IN", 2), out: rate("PRICE_SONNET_OUT", 10) },
  haiku: { in: rate("PRICE_HAIKU_IN", 1), out: rate("PRICE_HAIKU_OUT", 5) },
  fable: { in: rate("PRICE_FABLE_IN", 10), out: rate("PRICE_FABLE_OUT", 50) },
};

// Cached input reads at roughly a tenth of the input rate and writes at
// roughly 1.25x. Prompt caching is the core cost strategy for a long
// manuscript, so pricing it correctly is most of the difference between a
// real number and a wrong one.
const CACHE_WRITE_MULTIPLIER = rate("PRICE_CACHE_WRITE_MULT", 1.25);
const CACHE_READ_MULTIPLIER = rate("PRICE_CACHE_READ_MULT", 0.1);

function rateFor(model: string): Rate {
  const m = model.toLowerCase();
  if (m.includes("fable") || m.includes("mythos")) return RATES.fable;
  if (m.includes("opus")) return RATES.opus;
  if (m.includes("haiku")) return RATES.haiku;
  return RATES.sonnet;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export function priceOf(model: string, usage: Usage): number {
  const r = rateFor(model);
  const perToken = (millions: number) => millions / 1_000_000;
  return (
    usage.inputTokens * perToken(r.in) +
    usage.outputTokens * perToken(r.out) +
    usage.cacheWriteTokens * perToken(r.in) * CACHE_WRITE_MULTIPLIER +
    usage.cacheReadTokens * perToken(r.in) * CACHE_READ_MULTIPLIER
  );
}

export async function recordSpend(
  entry: Usage & { agent: string; model: string; userId?: string; bookId?: string },
): Promise<number> {
  const usd = priceOf(entry.model, entry);
  try {
    await query(
      `INSERT INTO spend (id, user_id, book_id, agent, model,
                          input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, usd)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        id("spd"),
        entry.userId ?? null,
        entry.bookId ?? null,
        entry.agent,
        entry.model,
        entry.inputTokens,
        entry.outputTokens,
        entry.cacheReadTokens,
        entry.cacheWriteTokens,
        usd,
      ],
    );
  } catch (err) {
    // Losing a spend row must not lose the author's chapter. Log loudly —
    // a silent accounting gap is how a ceiling stops being a ceiling.
    console.error("[spend] failed to record usage", err);
  }
  return usd;
}

export class SpendLimitReached extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpendLimitReached";
  }
}

/**
 * Checked before an agent run, not after, and read from the database rather
 * than a counter in memory — a counter in memory resets on every deploy,
 * which is exactly when you least want the ceiling to disappear.
 */
export async function assertWithinBudget(userId?: string): Promise<void> {
  if (DAILY_LIMIT_USD !== undefined) {
    const row = await one<{ total: string }>(
      `SELECT COALESCE(SUM(usd), 0) AS total FROM spend WHERE created_at > now() - interval '1 day'`,
    );
    if (Number(row?.total ?? 0) >= DAILY_LIMIT_USD) {
      throw new SpendLimitReached(
        "Storykeep has reached today's writing budget. Your work is saved — try again tomorrow.",
      );
    }
  }
  if (USER_MONTHLY_LIMIT_USD !== undefined && userId) {
    const row = await one<{ total: string }>(
      `SELECT COALESCE(SUM(usd), 0) AS total FROM spend
        WHERE user_id = $1 AND created_at > now() - interval '30 days'`,
      [userId],
    );
    if (Number(row?.total ?? 0) >= USER_MONTHLY_LIMIT_USD) {
      throw new SpendLimitReached(
        "You've reached this month's writing allowance. Everything you've written is saved.",
      );
    }
  }
}

export async function spendSummary(): Promise<{ today: number; month: number }> {
  const rows = await query<{ today: string; month: string }>(
    `SELECT COALESCE(SUM(usd) FILTER (WHERE created_at > now() - interval '1 day'), 0) AS today,
            COALESCE(SUM(usd) FILTER (WHERE created_at > now() - interval '30 days'), 0) AS month
       FROM spend`,
  );
  return { today: Number(rows[0]?.today ?? 0), month: Number(rows[0]?.month ?? 0) };
}
