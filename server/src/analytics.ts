import * as fs from "fs";
import * as path from "path";
import { isDbEnabled, query } from "./db";

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
  if (isDbEnabled()) {
    void query("INSERT INTO events (event, props) VALUES ($1, $2)", [event, JSON.stringify(props)]).catch(() => {
      // Never let the receipt book take down the kitchen.
    });
    return;
  }
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(LOG_PATH, JSON.stringify({ t: new Date().toISOString(), event, ...props }) + "\n");
  } catch {
    // Never let the receipt book take down the kitchen.
  }
}

export interface StoreConversion {
  /** Times a plan sent someone to this store. */
  recommended: number;
  /** Times someone marked something bought there. */
  purchased: number;
  /** purchased / recommended, the number a store owner cares about. */
  rate: number;
}

export interface Stats {
  since: string | null;
  totals: Record<string, number>;
  storeRecommendations: Record<string, number>;
  /** The partnership pitch, countable: sent you 40, 14 of them bought. */
  storeConversion: Record<string, StoreConversion>;
  /** Which kinds of recommendation get acted on and which get ignored. */
  purchasesByCategory: Record<string, number>;
}

// Aggregate counts only — no per-user data leaves this function.
export function readStats(): Stats {
  const totals: Record<string, number> = {};
  const storeRecommendations: Record<string, number> = {};
  const storePurchases: Record<string, number> = {};
  const purchasesByCategory: Record<string, number> = {};
  let since: string | null = null;
  try {
    const lines = fs.readFileSync(LOG_PATH, "utf8").split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line) as {
          t?: string;
          event?: string;
          storeIds?: string[];
          storeId?: string;
          category?: string;
        };
        if (!e.event) continue;
        if (!since && e.t) since = e.t;
        totals[e.event] = (totals[e.event] ?? 0) + 1;
        if (e.event === "plan_generated" && Array.isArray(e.storeIds)) {
          for (const id of e.storeIds) {
            storeRecommendations[id] = (storeRecommendations[id] ?? 0) + 1;
          }
        }
        // A check-off is the only signal in the product that a
        // recommendation turned into a purchase, so it is worth decoding
        // rather than counting.
        if (e.event === "item_purchased" || e.event === "item_unpurchased") {
          // Unchecking has to subtract. A man who ticks a box and changes
          // his mind has not bought anything, and the conversion rate here
          // is a number we intend to put in front of store owners.
          const delta = e.event === "item_purchased" ? 1 : -1;
          const bump = (rec: Record<string, number>, key: string) => {
            rec[key] = Math.max(0, (rec[key] ?? 0) + delta);
          };
          if (e.storeId) bump(storePurchases, e.storeId);
          if (e.category) bump(purchasesByCategory, e.category);
        }
      } catch {
        // Skip corrupt lines; keep counting.
      }
    }
  } catch {
    // No log yet — empty stats.
  }
  const storeConversion: Record<string, StoreConversion> = {};
  for (const id of new Set([...Object.keys(storeRecommendations), ...Object.keys(storePurchases)])) {
    const recommended = storeRecommendations[id] ?? 0;
    const purchased = storePurchases[id] ?? 0;
    storeConversion[id] = {
      recommended,
      purchased,
      rate: recommended > 0 ? Number((purchased / recommended).toFixed(3)) : 0,
    };
  }
  return { since, totals, storeRecommendations, storeConversion, purchasesByCategory };
}
