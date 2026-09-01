/**
 * Deep store research — the moat.
 *
 * Two phases, both driven by live web search:
 *   1. DISCOVERY: hunt for Houston menswear retailers missing from the
 *      directory, weighted toward local, independent, and lesser-known
 *      shops rather than the national names everyone already knows.
 *   2. ENRICHMENT: for every store we carry, research the brands it
 *      actually stocks, real price points with examples, and the
 *      insider detail that makes it worth the drive.
 *
 * Writes:
 *   - src/data/storeIntel.ts     (generated: brands, prices, insider take)
 *   - scripts/out/discovered.json (candidates for human review — NOT
 *     auto-merged into the directory; a person decides what's real)
 *
 * Usage: cd server && npx ts-node --transpile-only scripts/research-stores.ts [--phase=discover|enrich|both]
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { HOUSTON_STORES } from "../src/data/houstonStores";
import { sanitizeVoice } from "../src/agents/voice";

const anthropic = new Anthropic();
const MODEL = process.env.ANTHROPIC_FAST_MODEL ?? "claude-sonnet-5";
const WEB_SEARCH = { type: "web_search_20260209", name: "web_search", max_uses: 3 } as const;

async function runWithSearch(system: string, user: string, maxTokens: number): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];
  for (let round = 0; round < 6; round++) {
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
  throw new Error("web-search turn did not finish within 6 rounds");
}

function extractJson<T>(text: string): T {
  // The researcher sometimes narrates before its JSON ("Let me extract
  // that…"), and prose can contain braces — so scan for the LAST balanced
  // object in the text rather than trusting the first brace.
  const starts: number[] = [];
  for (let i = 0; i < text.length; i++) if (text[i] === "{") starts.push(i);
  for (const start of starts) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(start, i + 1)) as T;
          } catch {
            break; // Malformed from this start; try the next one.
          }
        }
      }
    }
  }
  throw new Error(`no parsable JSON object in: ${text.slice(0, 160)}`);
}

// Web searches occasionally time out; one retry costs little and saves an
// entire research angle from being lost.
async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`  ${label}: retrying after ${(err as Error).message.slice(0, 50)}`);
    return await fn();
  }
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

// ---------------------------------------------------------------------
// PHASE 1 — DISCOVERY
// ---------------------------------------------------------------------

// Angles chosen to surface what a generic "best menswear Houston" search
// never returns: neighborhood shops, immigrant-owned tailors, resale, the
// places locals name but lists don't.
const DISCOVERY_ANGLES: { id: string; prompt: string }[] = [
  {
    id: "independent-boutiques",
    prompt:
      "Independent, locally owned men's clothing boutiques in Houston, small shops, not chains. Include Montrose, the Heights, Rice Village, EaDo, Midtown, Third Ward, and Washington Ave.",
  },
  {
    id: "custom-tailors",
    prompt:
      "Custom tailors, bespoke suit makers, and made-to-measure shops in Houston, including small family-run and immigrant-owned shops that serve men (Vietnamese, Indian/South Asian, Middle Eastern, Latino tailoring traditions in Houston).",
  },
  {
    id: "alterations",
    prompt:
      "The best alterations and tailoring shops in Houston for menswear, the ones locals recommend on Reddit, Nextdoor, and local forums for suits and dress trousers.",
  },
  {
    id: "luxury-resale",
    prompt:
      "Luxury consignment, high-end resale, and designer thrift stores in Houston that carry menswear, where men buy secondhand designer suits, shoes, and watches.",
  },
  {
    id: "streetwear-sneakers",
    prompt:
      "Houston streetwear boutiques and premium sneaker stores, including locally owned shops with Houston culture roots.",
  },
  {
    id: "suburban",
    prompt:
      "Men's clothing stores, custom tailors, and menswear boutiques in Houston's suburbs: Katy, Sugar Land, The Woodlands, Pearland, Cypress, and Memorial City.",
  },
  {
    id: "specialty",
    prompt:
      "Houston specialty menswear: hat shops, leather goods makers, custom shirt makers, barbershop-and-goods hybrids, and men's grooming stores that also sell clothing or accessories.",
  },
  {
    id: "local-favorites",
    prompt:
      "What menswear stores do Houston locals actually recommend to each other? Search Reddit r/houston, local blogs, Houston Chronicle and Houstonia 'best of' lists for men's clothing shops.",
  },
];

interface Candidate {
  name: string;
  neighborhood: string;
  whatItIs: string;
  whyNotable: string;
  website: string;
  evidence: string;
}

async function discover(angle: { id: string; prompt: string }, knownNames: string[]): Promise<Candidate[]> {
  const text = await runWithSearch(
    "You are a Houston retail researcher. Search the live web, then answer ONLY with a single JSON object, no prose outside it.",
    `Research this: ${angle.prompt}

We ALREADY have these stores in our directory, so EXCLUDE them and any obvious duplicates:
${knownNames.join(", ")}

Find real, currently operating businesses only, verify each appears to exist right now (a live website, current listings, recent reviews). Skip anything you cannot substantiate. National chains are only worth listing if they have a genuine Houston-area location AND we don't already have them.

Answer ONLY this JSON:
{"candidates": [{"name": "<exact business name>", "neighborhood": "<Houston area/neighborhood>", "whatItIs": "<one sentence: what they sell and to whom, max 25 words>", "whyNotable": "<what makes this place worth a Houston man's drive, the specific thing, max 25 words>", "website": "<url or empty string>", "evidence": "<where you found it: publication, review site, or the store's own site, max 12 words>"}]}
Return up to 8 candidates, best first. Empty array if nothing new and real turned up.`,
    3000,
  );
  const raw = extractJson<{ candidates?: Candidate[] }>(text);
  return Array.isArray(raw.candidates) ? raw.candidates : [];
}

// ---------------------------------------------------------------------
// PHASE 2 — ENRICHMENT
// ---------------------------------------------------------------------

export interface StoreIntel {
  /** Brands/labels the store actually carries, from live research. */
  brands: string[];
  /** Real price points, each "<item>: <price>" — no invented numbers. */
  pricePoints: string[];
  /** The insider detail that makes this store worth the trip. */
  insiderTake: string;
  researchedAt: string;
}

async function enrich(store: (typeof HOUSTON_STORES)[number]): Promise<StoreIntel> {
  const text = await runWithSearch(
    "You are a menswear retail researcher. Search the live web, then answer ONLY with a single JSON object, no prose outside it. Never invent a brand or a price: if research doesn't confirm it, leave it out.",
    `Research this Houston store in depth:
Name: ${store.name}
Area: ${store.neighborhood}
Website: ${store.website}
What we know: ${store.description}

Find:
1. BRANDS: the actual labels/brands they stock or make (their own house label counts). Only ones you can confirm.
2. PRICE POINTS: real, current prices for specific items, from their site or credible current sources. Format each as "item: price" (e.g. "made-to-measure suit: from $1,295", "dress shirt: $185-350").
3. INSIDER TAKE: the one thing a Houston man should know before walking in that isn't obvious from their website: a service, a program, a person to ask for, a quirk of how they operate, what they're genuinely best at versus what they merely stock.

Answer ONLY this JSON:
{"brands": ["<brand>", ...], "pricePoints": ["<item: price>", ...], "insiderTake": "<max 35 words, specific and useful, empty string if nothing solid found>"}
Up to 10 brands and 6 price points. Empty arrays are correct answers when research doesn't confirm specifics, an empty array beats a guess.`,
    3000,
  );
  const raw = extractJson<{ brands?: unknown; pricePoints?: unknown; insiderTake?: unknown }>(text);
  const clean = (v: unknown, max: number): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim().slice(0, 90)).slice(0, max)
      : [];
  const take = typeof raw.insiderTake === "string" ? raw.insiderTake.trim().slice(0, 260) : "";
  // This text ends up inside the planner's system prompt, and the model
  // mirrors the register of what it's given, so the house voice rules
  // apply to researched data exactly as they do to hand-written prompts.
  return sanitizeVoice({
    brands: clean(raw.brands, 10),
    pricePoints: clean(raw.pricePoints, 6),
    // A failed search sometimes narrates its failure into the field.
    insiderTake: /unable to|could not|no information|not found/i.test(take) ? "" : take,
    researchedAt: new Date().toISOString().slice(0, 10),
  });
}

// ---------------------------------------------------------------------

async function main() {
  const phase = (process.argv.find((a) => a.startsWith("--phase="))?.split("=")[1] ?? "both") as
    | "discover"
    | "enrich"
    | "both";
  const outDir = path.join(__dirname, "out");
  fs.mkdirSync(outDir, { recursive: true });

  if (phase === "discover" || phase === "both") {
    const knownNames = HOUSTON_STORES.map((s) => s.name);
    console.log(`[research] discovery across ${DISCOVERY_ANGLES.length} angles…`);
    const found = await pool(DISCOVERY_ANGLES, 3, async (angle) => {
      try {
        const candidates = await withRetry(angle.id, () => discover(angle, knownNames));
        console.log(`  ${angle.id}: ${candidates.length} candidate(s)`);
        return { angle: angle.id, candidates };
      } catch (err) {
        console.warn(`  ${angle.id}: FAILED (${(err as Error).message.slice(0, 70)})`);
        return { angle: angle.id, candidates: [] as Candidate[] };
      }
    });
    // De-dupe across angles by lowercased name.
    const seen = new Set(HOUSTON_STORES.map((s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, "")));
    const unique: (Candidate & { angle: string })[] = [];
    for (const group of found) {
      for (const c of group.candidates) {
        const key = (c.name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!key || seen.has(key)) continue;
        seen.add(key);
        unique.push({ ...c, angle: group.angle });
      }
    }
    fs.writeFileSync(path.join(outDir, "discovered.json"), JSON.stringify(unique, null, 2));
    console.log(`[research] ${unique.length} unique candidates → scripts/out/discovered.json`);
  }

  if (phase === "enrich" || phase === "both") {
    // Resume by default: a store with researched brands or prices is left
    // alone, so a re-run after a failure only pays for what's missing.
    const force = process.argv.includes("--force");
    const existing: Record<string, StoreIntel> = {};
    if (!force) {
      try {
        const mod = await import("../src/data/storeIntel");
        Object.assign(existing, mod.STORE_INTEL as Record<string, StoreIntel>);
      } catch {
        // No prior run — enrich everything.
      }
    }
    const hasIntel = (id: string) => {
      const prior = existing[id];
      return Boolean(prior && (prior.brands.length > 0 || prior.pricePoints.length > 0 || prior.insiderTake));
    };
    // --only=id,id targets specific stores. Without it, resume picks up
    // everything unresearched, which includes single-brand shops where the
    // brands field is meaningless (Warby Parker sells Warby Parker) and
    // paying to learn that again is waste.
    const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",").filter(Boolean);
    const todo = only
      ? HOUSTON_STORES.filter((s) => only.includes(s.id))
      : HOUSTON_STORES.filter((s) => !hasIntel(s.id));
    if (only && todo.length !== only.length) {
      const missing = only.filter((id) => !HOUSTON_STORES.some((s) => s.id === id));
      console.warn(`[research] unknown store id(s): ${missing.join(", ")}`);
    }
    console.log(
      `[research] enriching ${todo.length} store(s)${todo.length < HOUSTON_STORES.length ? ` (${HOUSTON_STORES.length - todo.length} already researched, resuming)` : ""}…`,
    );
    const intel: Record<string, StoreIntel> = { ...existing };
    const results = await pool(todo, 3, async (store) => {
      try {
        const i = await withRetry(store.id, () => enrich(store));
        console.log(`  ${store.id}: ${i.brands.length} brands, ${i.pricePoints.length} prices`);
        return [store.id, i] as const;
      } catch (err) {
        console.warn(`  ${store.id}: FAILED (${(err as Error).message.slice(0, 70)})`);
        return [store.id, { brands: [], pricePoints: [], insiderTake: "", researchedAt: new Date().toISOString().slice(0, 10) }] as const;
      }
    });
    for (const [id, i] of results) {
      // Never let a failed re-run erase intel a previous run captured.
      if (i.brands.length > 0 || i.pricePoints.length > 0 || i.insiderTake) intel[id] = i;
      else if (!intel[id]) intel[id] = i;
    }

    fs.writeFileSync(
      path.join(__dirname, "..", "src", "data", "storeIntel.ts"),
      `// GENERATED by scripts/research-stores.ts on ${new Date().toISOString().slice(0, 10)}, do not hand-edit.
// Deep per-store intelligence from live web research: the brands each
// store actually carries, real price points, and the insider detail that
// makes it worth the drive.
export interface StoreIntel {
  brands: string[];
  pricePoints: string[];
  insiderTake: string;
  researchedAt: string;
}

export const STORE_INTEL: Record<string, StoreIntel> = ${JSON.stringify(intel, null, 2)};
`,
    );
    const withBrands = Object.values(intel).filter((i) => i.brands.length > 0).length;
    const withPrices = Object.values(intel).filter((i) => i.pricePoints.length > 0).length;
    console.log(`[research] intel written: ${withBrands}/${HOUSTON_STORES.length} with brands, ${withPrices} with prices`);
  }
}

main().catch((err) => {
  console.error("[research] FAILED:", err);
  process.exit(1);
});
