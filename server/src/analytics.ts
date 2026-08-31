import * as fs from "fs";
import * as path from "path";

/**
 * The receipt book. Fire-and-forget event log (one JSON line per event)
 * that makes the store-partnership pitch countable: "we sent Hamilton
 * Shirts 14 fitted customers this month" only works if it's counted.
 * Zero model calls, zero customer-visible latency; a failed write is
 * swallowed — analytics must never break the product.
 */

const DATA_DIR = process.env.DATA_DIR ?? path.join(__dirname, "..", ".data");
const LOG_PATH = path.join(DATA_DIR, "events.jsonl");

export function track(event: string, props: Record<string, unknown> = {}): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(LOG_PATH, JSON.stringify({ t: new Date().toISOString(), event, ...props }) + "\n");
  } catch {
    // Never let the receipt book take down the kitchen.
  }
}

export interface Stats {
  since: string | null;
  totals: Record<string, number>;
  storeRecommendations: Record<string, number>;
}

// Aggregate counts only — no per-user data leaves this function.
export function readStats(): Stats {
  const totals: Record<string, number> = {};
  const storeRecommendations: Record<string, number> = {};
  let since: string | null = null;
  try {
    const lines = fs.readFileSync(LOG_PATH, "utf8").split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line) as { t?: string; event?: string; storeIds?: string[] };
        if (!e.event) continue;
        if (!since && e.t) since = e.t;
        totals[e.event] = (totals[e.event] ?? 0) + 1;
        if (e.event === "plan_generated" && Array.isArray(e.storeIds)) {
          for (const id of e.storeIds) {
            storeRecommendations[id] = (storeRecommendations[id] ?? 0) + 1;
          }
        }
      } catch {
        // Skip corrupt lines; keep counting.
      }
    }
  } catch {
    // No log yet — empty stats.
  }
  return { since, totals, storeRecommendations };
}
