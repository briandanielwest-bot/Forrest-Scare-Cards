/**
 * Store research, dive 2 — the sweep that finds what a "best menswear in
 * Houston" list never will.
 *
 * Dive 1 (research-stores.ts --phase=discover) searched broad categories.
 * This one goes at the map and the culture: neighborhood-by-neighborhood
 * sweeps, Houston's actual communities and their tailoring traditions,
 * local publications' own reporting, and recent openings.
 *
 * Candidates land in scripts/out/discovered-dive2.json for human review —
 * nothing auto-merges into the directory.
 *
 * Usage: cd server && npx ts-node --transpile-only scripts/research-dive2.ts
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { HOUSTON_STORES } from "../src/data/houstonStores";

const anthropic = new Anthropic();
const MODEL = process.env.ANTHROPIC_FAST_MODEL ?? "claude-sonnet-5";
const WEB_SEARCH = { type: "web_search_20260209", name: "web_search", max_uses: 6 } as const;

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

const DEEP_ANGLES: { id: string; prompt: string }[] = [
  // --- The map: neighborhood sweeps ---
  { id: "nbhd-heights-washington", prompt: "Men's clothing stores, tailors, boutiques, and menswear shops physically located in the Houston Heights, Washington Avenue corridor, or Sawyer Yards." },
  { id: "nbhd-montrose-midtown", prompt: "Men's clothing stores, vintage shops with menswear, tailors, and boutiques in Montrose, Midtown, or the Museum District of Houston." },
  { id: "nbhd-galleria-uptown", prompt: "Menswear stores in Houston's Galleria/Uptown and Post Oak area beyond the big department stores — smaller shops, custom clothiers, and specialty retailers." },
  { id: "nbhd-river-oaks-kirby", prompt: "Menswear shops, custom clothiers, and men's boutiques in River Oaks, Upper Kirby, Highland Village, and West University in Houston." },
  { id: "nbhd-east-north", prompt: "Men's clothing and custom tailoring in EaDo, the East End, Northside, Near Northside, and Second Ward Houston." },
  { id: "nbhd-southwest-bellaire", prompt: "Men's clothing stores and tailors along Bellaire Boulevard, in Sharpstown, Chinatown Houston, Gulfton, and southwest Houston." },
  // --- The culture: Houston's actual communities ---
  { id: "culture-african", prompt: "Houston tailors and clothiers serving the Nigerian, Ghanaian, and West African communities — custom suits, agbada, and formal menswear. Houston has one of the largest Nigerian populations in the US." },
  { id: "culture-southasian-mideast", prompt: "Houston men's tailors and formalwear shops serving South Asian (Indian, Pakistani) and Middle Eastern communities — sherwani, custom suiting, and men's formal wear, especially in Hillcroft/Mahatma Gandhi District." },
  { id: "culture-vietnamese-latino", prompt: "Vietnamese-owned tailors and Latino-owned menswear or western wear shops in Houston — including Bellaire's Little Saigon and Latino shopping districts." },
  // --- The record: what local media actually reported ---
  { id: "media-local-press", prompt: "Menswear stores in Houston covered by CultureMap Houston, PaperCity Magazine, Houstonia, the Houston Chronicle, or Texas Monthly — best men's shops, new store openings, and profiles of local clothiers." },
  { id: "media-new-openings", prompt: "Men's clothing stores, boutiques, or custom clothiers that opened in Houston in the last two years — new arrivals and recently expanded shops." },
  // --- The gaps: categories we may be thin on ---
  { id: "gap-shoes-leather", prompt: "Houston shoe repair, cobblers, custom leather goods makers, and shoe stores that carry quality men's dress shoes (Goodyear-welted, resoleable)." },
  { id: "gap-bigtall-athletic", prompt: "Houston menswear for big and tall men, and shops that fit athletic or muscular builds well — including tailors known for that work." },
  { id: "gap-formal-rental", prompt: "Houston tuxedo shops, black-tie formalwear, and formal rental for men beyond the national chains — including shops for galas and weddings." },
  { id: "gap-workwear-uniform", prompt: "Houston workwear and uniform retailers that also serve professional men — flame-resistant clothing for energy workers, and quality work boots and shirts that read professional on site visits." },
];

interface Candidate {
  name: string;
  neighborhood: string;
  whatItIs: string;
  whyNotable: string;
  website: string;
  evidence: string;
  confidence: "high" | "medium" | "low";
}

async function discover(angle: { id: string; prompt: string }, knownNames: string[]): Promise<Candidate[]> {
  const text = await runWithSearch(
    "You are a Houston retail researcher with a bias toward finding real places others miss. Search the live web, then answer ONLY with a single JSON object — no prose outside it.",
    `Research this: ${angle.prompt}

ALREADY IN OUR DIRECTORY — exclude these and obvious duplicates:
${knownNames.join(", ")}

Rules:
- Real, currently operating Houston-area businesses only.
- Report what you find WITH a confidence rating rather than dropping anything uncertain: "high" = live website or multiple current sources; "medium" = credible listing or recent reviews; "low" = mentioned but thin evidence. A human reviews these, so a medium-confidence real shop is more useful than an empty list.
- Small, local, family-owned, and community-serving businesses are the POINT of this search — do not skip a place for being obscure or having a weak web presence. That is exactly what we're looking for.
- Do not invent businesses. If a search genuinely surfaces nothing, return an empty array.

Answer ONLY this JSON:
{"candidates": [{"name": "<exact business name>", "neighborhood": "<Houston area>", "whatItIs": "<what they sell and to whom, max 25 words>", "whyNotable": "<the specific reason a Houston man should know this place, max 25 words>", "website": "<url or empty string>", "evidence": "<source: publication, review site, or their own site, max 12 words>", "confidence": "high|medium|low"}]}
Up to 8 candidates, best first.`,
    5000,
  );
  const raw = extractJson<{ candidates?: Candidate[] }>(text);
  return Array.isArray(raw.candidates) ? raw.candidates : [];
}

async function main() {
  const outDir = path.join(__dirname, "out");
  fs.mkdirSync(outDir, { recursive: true });
  const knownNames = HOUSTON_STORES.map((s) => s.name);

  // Anything dive 1 already surfaced also counts as known, so dive 2 only
  // reports genuinely new ground.
  let priorNames: string[] = [];
  try {
    const prior = JSON.parse(fs.readFileSync(path.join(outDir, "discovered.json"), "utf8")) as { name: string }[];
    priorNames = prior.map((c) => c.name);
  } catch {
    // Dive 1 output not present — fine.
  }

  console.log(`[dive2] ${DEEP_ANGLES.length} angles, excluding ${knownNames.length + priorNames.length} known names…`);
  const found = await pool(DEEP_ANGLES, 3, async (angle) => {
    try {
      const candidates = await withRetry(angle.id, () => discover(angle, [...knownNames, ...priorNames]));
      console.log(`  ${angle.id}: ${candidates.length} candidate(s)`);
      return { angle: angle.id, candidates };
    } catch (err) {
      console.warn(`  ${angle.id}: FAILED (${(err as Error).message.slice(0, 70)})`);
      return { angle: angle.id, candidates: [] as Candidate[] };
    }
  });

  const seen = new Set([...knownNames, ...priorNames].map((n) => n.toLowerCase().replace(/[^a-z0-9]/g, "")));
  const unique: (Candidate & { angle: string })[] = [];
  for (const group of found) {
    for (const c of group.candidates) {
      const key = (c.name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push({ ...c, angle: group.angle });
    }
  }
  unique.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 } as const;
    return (rank[a.confidence] ?? 3) - (rank[b.confidence] ?? 3);
  });
  fs.writeFileSync(path.join(outDir, "discovered-dive2.json"), JSON.stringify(unique, null, 2));
  const byConf = unique.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.confidence]: (acc[c.confidence] ?? 0) + 1 }), {});
  console.log(`[dive2] ${unique.length} unique candidates (${JSON.stringify(byConf)}) → scripts/out/discovered-dive2.json`);
}

main().catch((err) => {
  console.error("[dive2] FAILED:", err);
  process.exit(1);
});
