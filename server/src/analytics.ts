import * as fs from "fs";
import * as path from "path";
import { isDbEnabled, query } from "./db";

/**
 * The receipt book. Fire-and-forget event log that makes the
 * store-partnership pitch countable: "we sent Hamilton Shirts 14 fitted
 * customers this month" only works if it's counted. Zero model calls, zero
 * customer-visible latency; a failed write is swallowed because analytics
 * must never break the product.
 *
 * Two backing stores, and reads have to follow writes between them. With
 * DATABASE_URL set the events go to Postgres; without it they go to one
 * JSON line per event on disk. readStats once only ever read the file,
 * so switching on Postgres silently emptied every number in /api/stats.
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
  /** Which store the counts came from, so an empty report is legible. */
  source: "postgres" | "file";
}

/** One event, however it was stored. */
interface Recorded {
  t?: string;
  event?: string;
  storeIds?: string[];
  storeId?: string;
  category?: string;
}

/**
 * The counting itself, over events in chronological order. Shared so the
 * database and the file can never drift into reporting different numbers
 * from the same events.
 */
function fold(events: Recorded[]): Stats {
  const totals: Record<string, number> = {};
  const storeRecommendations: Record<string, number> = {};
  const storePurchases: Record<string, number> = {};
  const purchasesByCategory: Record<string, number> = {};
  let since: string | null = null;

  for (const e of events) {
    if (!e.event) continue;
    if (!since && e.t) since = e.t;
    totals[e.event] = (totals[e.event] ?? 0) + 1;
    if (e.event === "plan_generated" && Array.isArray(e.storeIds)) {
      for (const id of e.storeIds) {
        storeRecommendations[id] = (storeRecommendations[id] ?? 0) + 1;
      }
    }
    // A check-off is the only signal in the product that a recommendation
    // turned into a purchase, so it is worth decoding rather than counting.
    if (e.event === "item_purchased" || e.event === "item_unpurchased") {
      // Unchecking has to subtract. A man who ticks a box and changes his
      // mind has not bought anything, and the conversion rate here is a
      // number we intend to put in front of store owners.
      const delta = e.event === "item_purchased" ? 1 : -1;
      const bump = (rec: Record<string, number>, key: string) => {
        rec[key] = Math.max(0, (rec[key] ?? 0) + delta);
      };
      if (e.storeId) bump(storePurchases, e.storeId);
      if (e.category) bump(purchasesByCategory, e.category);
    }
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
  return { since, totals, storeRecommendations, storeConversion, purchasesByCategory, source: "file" };
}

function readFileEvents(): Recorded[] {
  const out: Recorded[] = [];
  try {
    for (const line of fs.readFileSync(LOG_PATH, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        out.push(JSON.parse(line) as Recorded);
      } catch {
        // Skip corrupt lines; keep counting.
      }
    }
  } catch {
    // No log yet.
  }
  return out;
}

// Aggregate counts only — no per-user data leaves this function.
export async function readStats(): Promise<Stats> {
  if (isDbEnabled()) {
    try {
      const rows = await query<{ at: Date; event: string; props: Record<string, unknown> }>(
        "SELECT at, event, props FROM events ORDER BY id ASC",
      );
      const stats = fold(
        rows.map((r) => ({
          t: r.at instanceof Date ? r.at.toISOString() : String(r.at),
          event: r.event,
          ...(r.props ?? {}),
        })),
      );
      return { ...stats, source: "postgres" };
    } catch (err) {
      // A reporting query must not 500 the endpoint. Fall through to the
      // file, which on a fresh deploy is simply empty.
      console.warn(`[analytics] db read failed (${(err as Error).message.slice(0, 80)}) — reading the file instead`);
    }
  }
  return fold(readFileEvents());
}
