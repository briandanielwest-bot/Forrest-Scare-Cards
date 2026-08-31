/**
 * "Ryan" — the front-office data refresher (offline job, not a chat agent),
 * named in homage to the ageless Houston fireballer: it keeps the roster
 * fresh forever.
 *
 * Re-verifies every store in the directory and rebuilds the seasonal brief
 * using the Claude API's server-side web search tool, then writes the
 * results as GENERATED TypeScript data files the server compiles in:
 *   - src/data/storeFreshness.ts  (per-store: open/closed, current note)
 *   - src/data/seasonBrief.ts     (next ~90 days of Houston style context)
 *
 * Run monthly (see .github/workflows/refresh-data.yml) or by hand:
 *   cd server && npm run refresh:data
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { HOUSTON_STORES } from "../src/data/houstonStores";

const anthropic = new Anthropic();
const MODEL = process.env.ANTHROPIC_FAST_MODEL ?? "claude-sonnet-5";
const WEB_SEARCH = { type: "web_search_20260209", name: "web_search", max_uses: 3 } as const;

interface Freshness {
  status: "open" | "closed" | "unclear";
  note: string;
  confidence: "high" | "low";
  checkedAt: string;
}

// Server tools can pause a long turn (stop_reason "pause_turn") — resume by
// echoing the assistant turn back until the model actually finishes.
async function runWithSearch(system: string, user: string, maxTokens: number): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];
  for (let round = 0; round < 5; round++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      tools: [WEB_SEARCH as unknown as Anthropic.ToolUnion],
      messages,
    });
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  }
  throw new Error("web-search turn did not finish within 5 rounds");
}

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`no JSON object in: ${text.slice(0, 200)}`);
  return JSON.parse(match[0]);
}

async function checkStore(store: (typeof HOUSTON_STORES)[number]): Promise<Freshness> {
  const text = await runWithSearch(
    "You verify retail facts with web search and answer ONLY with a single JSON object — no prose before or after.",
    `Verify this Houston menswear store with a quick web search:
Name: ${store.name}
Area: ${store.neighborhood}
Website: ${store.website}

Answer ONLY this JSON:
{"status": "open" | "closed" | "unclear", "note": "<one current, shopper-useful fact if any — prioritize insider-grade intel: a sale running, a trunk show or MTM event, a service policy worth knowing (free alterations, same-day tailoring, appointment perks), a move or new location; max 180 chars; empty string if nothing notable>", "confidence": "high" | "low"}
"closed" ONLY with clear evidence (permanently closed listing, dead business). If searches are ambiguous, use "unclear" with confidence "low". The note must be CURRENT as of today's date — reject anything dated in the past (a "holiday" event months ago, last winter's sale); an empty note beats a stale one. Never generic marketing.`,
    1500,
  );
  const raw = extractJson(text) as Partial<Freshness>;
  const status = raw.status === "open" || raw.status === "closed" || raw.status === "unclear" ? raw.status : "unclear";
  return {
    status,
    note: typeof raw.note === "string" ? raw.note.slice(0, 200) : "",
    confidence: raw.confidence === "high" ? "high" : "low",
    checkedAt: new Date().toISOString().slice(0, 10),
  };
}

async function buildSeasonBrief(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const text = await runWithSearch(
    "You are a Houston menswear intelligence researcher. Use web search, then answer ONLY with a single JSON object.",
    `Today is ${today}. Research the NEXT ~90 DAYS for Houston, Texas:
1. Major Houston events that affect how men dress (Houston Livestock Show & Rodeo, CERAWeek, OTC, major gala/benefit season, anything comparable actually happening in this window) — with their real dates.
2. Major menswear sales running now or starting soon (national retailers with Houston stores and notable local ones).

Answer ONLY this JSON:
{"brief": "<one tight paragraph, max 800 chars, written as ground-truth planning intel: which events fall in this window with dates, and which sales are live/imminent. Only include what search confirmed; no filler.>"}`,
    3000,
  );
  const raw = extractJson(text) as { brief?: string };
  if (!raw.brief) throw new Error("season brief came back empty");
  return raw.brief.slice(0, 1000);
}

// Monthly-verified price intel: what's actually marked down or shifted at
// the directory's key retailers. Baked into the agents' knowledge so they
// answer with current numbers instead of hedging at runtime.
async function buildPriceBrief(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const text = await runWithSearch(
    "You are a menswear pricing researcher. Use web search, then answer ONLY with a single JSON object.",
    `Today is ${today}. Research CURRENT menswear pricing intel relevant to Houston shoppers at these retailers: Suitsupply, Indochino, Nordstrom, Allen Edmonds, Johnston & Murphy, Tecovas, Charles Tyrwhitt, Bonobos, Buck Mason, Warby Parker.
1. Sales or promotions running NOW or starting within ~30 days (with real percentages/amounts where confirmed).
2. Any notable price changes vs their usual levels (a line moved up-market, an entry price dropped).

Answer ONLY this JSON:
{"brief": "<max 700 chars, tight planning intel: 'Retailer: fact' lines separated by ' | '. Only search-confirmed facts with numbers; no marketing language; empty string if genuinely nothing notable.>"}`,
    3000,
  );
  const raw = extractJson(text) as { brief?: string };
  const brief = (raw.brief ?? "").slice(0, 900);
  // A failed search sometimes narrates its failure INTO the brief field —
  // never store an apology as pricing intel.
  if (/unavailable|unable to|please retry|rate limit|could not/i.test(brief)) return "";
  return brief;
}

async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

async function main() {
  console.log(`[refresh] checking ${HOUSTON_STORES.length} stores with live web search…`);
  const freshness: Record<string, Freshness> = {};
  const results = await pool(HOUSTON_STORES, 4, async (store) => {
    try {
      const f = await checkStore(store);
      console.log(`  ${store.id}: ${f.status}${f.note ? ` — ${f.note.slice(0, 60)}` : ""}`);
      return [store.id, f] as const;
    } catch (err) {
      console.warn(`  ${store.id}: check failed (${(err as Error).message.slice(0, 80)}) — keeping unverified`);
      return [store.id, { status: "unclear", note: "", confidence: "low", checkedAt: new Date().toISOString().slice(0, 10) } as Freshness] as const;
    }
  });
  for (const [id, f] of results) freshness[id] = f;

  console.log("[refresh] building season brief…");
  const brief = await buildSeasonBrief();
  console.log("[refresh] building price brief…");
  let priceBrief = "";
  try {
    priceBrief = await buildPriceBrief();
  } catch (err) {
    console.warn(`[refresh] price brief failed (${(err as Error).message.slice(0, 80)}) — keeping empty`);
  }
  const generatedAt = new Date().toISOString().slice(0, 10);

  const dataDir = path.join(__dirname, "..", "src", "data");
  fs.writeFileSync(
    path.join(dataDir, "storeFreshness.ts"),
    `// GENERATED by scripts/refresh-data.ts on ${generatedAt} — do not hand-edit.
// Per-store freshness from live web search: operating status + one current note.
export interface StoreFreshness {
  status: "open" | "closed" | "unclear";
  note: string;
  confidence: "high" | "low";
  checkedAt: string;
}

export const STORE_FRESHNESS: Record<string, StoreFreshness> = ${JSON.stringify(freshness, null, 2)};
`,
  );
  fs.writeFileSync(
    path.join(dataDir, "seasonBrief.ts"),
    `// GENERATED by scripts/refresh-data.ts on ${generatedAt} — do not hand-edit.
// Rolling ~90-day Houston style intel from live web search.
export const SEASON_BRIEF_DATE = ${JSON.stringify(generatedAt)};
export const SEASON_BRIEF = ${JSON.stringify(brief)};
`,
  );

  fs.writeFileSync(
    path.join(dataDir, "priceBrief.ts"),
    `// GENERATED by scripts/refresh-data.ts on ${generatedAt} — do not hand-edit.
// Monthly-verified menswear pricing intel for the directory's key retailers.
export const PRICE_BRIEF_DATE = ${JSON.stringify(generatedAt)};
export const PRICE_BRIEF = ${JSON.stringify(priceBrief)};
`,
  );

  const closed = Object.entries(freshness).filter(([, f]) => f.status === "closed");
  console.log(`[refresh] done. ${Object.keys(freshness).length} stores checked, ${closed.length} flagged closed${closed.length ? ` (${closed.map(([id]) => id).join(", ")})` : ""}.`);
  console.log(`[refresh] season brief: ${brief.slice(0, 160)}…`);
}

main().catch((err) => {
  console.error("[refresh] FAILED:", err);
  process.exit(1);
});
