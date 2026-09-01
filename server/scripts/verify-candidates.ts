/**
 * Verify discovered store candidates: `npx ts-node --transpile-only scripts/verify-candidates.ts`
 *
 * scripts/research-stores.ts found sixteen Houston shops the directory
 * did not know about. Discovery is not verification: a name and a claim
 * from a search result is not enough to send a man across town, so none
 * of them were ever added.
 *
 * This confirms each one independently and produces the fields the
 * directory actually needs. A candidate passes only when research
 * confirms it is currently operating AND finds a real street address.
 * Anything else is reported and left out, because a listing that sends
 * someone to a closed shop is worse than no listing.
 *
 * Writes scripts/out/verified-candidates.json. Nothing is added to the
 * directory automatically; the file is for a human to read first.
 *
 * Flags: --all (include the chains, default is the independents),
 *        --force (re-check ones already verified).
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();
const MODEL = process.env.ANTHROPIC_FAST_MODEL ?? "claude-sonnet-5";
const WEB_SEARCH = { type: "web_search_20260209", name: "web_search", max_uses: 4 } as const;

const OUT_DIR = path.join(__dirname, "out");
const OUT_PATH = path.join(OUT_DIR, "verified-candidates.json");
const IN_PATH = path.join(OUT_DIR, "discovered.json");

interface Candidate {
  name: string;
  neighborhood?: string;
  whatItIs?: string;
  whyNotable?: string;
  website?: string;
  angle?: string;
}

interface Verified {
  name: string;
  verdict: "confirmed" | "unconfirmed" | "closed";
  /** Why the verdict, in a sentence a human can act on. */
  reason: string;
  address?: string;
  phone?: string;
  website?: string;
  priceTier?: "$" | "$$" | "$$$" | "$$$$";
  knownFor?: string;
  catersTo?: string;
  howToBuy?: string;
  checkedAt: string;
}

// The chains add nothing a competitor could not list in an afternoon. The
// independents are the whole point of having done the discovery.
const SKIP = ["Men's Wearhouse", "Jos. A. Bank", "Von Maur", "Buffalo Exchange", "Mr. Formal"];

async function runWithSearch(system: string, user: string, maxTokens: number): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];
  for (let round = 0; round < 5; round++) {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      tools: [WEB_SEARCH as unknown as Anthropic.ToolUnion],
      messages,
    });
    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  }
  throw new Error("search did not settle in five rounds");
}

/** Balanced-brace extraction: models narrate before JSON more often than not. */
function extractJson<T>(text: string): T {
  const start = text.indexOf("{");
  if (start < 0) throw new Error(`no JSON object in: ${text.slice(0, 90)}`);
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    if (c === "}" && --depth === 0) return JSON.parse(text.slice(start, i + 1)) as T;
  }
  throw new Error(`unbalanced JSON in: ${text.slice(0, 90)}`);
}

async function verify(c: Candidate): Promise<Verified> {
  const text = await runWithSearch(
    "You verify that a local business is real and currently trading, using web search. You are cautious by default: a listing that sends a customer to a closed shop is worse than no listing. Answer ONLY with a single JSON object.",
    `Verify this Houston menswear business is real and currently open.

Name: ${c.name}
Area we think it is in: ${c.neighborhood ?? "unknown"}
What we think it is: ${c.whatItIs ?? "unknown"}
Website we have: ${c.website ?? "none"}

Confirm from independent current sources (its own site, a maps listing, recent reviews):
1. Is this business currently operating? Recent reviews or a live site count. A permanently-closed marker anywhere means closed.
2. Its street address in the Houston area.
3. Its phone number.
4. Roughly what it costs: $ = budget, $$ = mid, $$$ = premium, $$$$ = luxury.
5. What it is genuinely known for, in one sentence, and who actually shops there, in one sentence.
6. How a man buys there: walk in, appointment, mobile fitting.

verdict rules, apply strictly:
- "confirmed" ONLY if it is currently operating AND you found a real street address.
- "closed" if you find evidence it shut down.
- "unconfirmed" for anything else, including when you simply cannot find enough. That is a perfectly good answer and is much better than a guess.

Answer ONLY this JSON:
{"verdict":"confirmed|unconfirmed|closed","reason":"<one sentence on what you found or could not find>","address":"","phone":"","website":"","priceTier":"$$","knownFor":"","catersTo":"","howToBuy":""}`,
    2000,
  );
  const raw = extractJson<Partial<Verified> & { verdict?: string }>(text);
  const verdict: Verified["verdict"] =
    raw.verdict === "confirmed" || raw.verdict === "closed" ? raw.verdict : "unconfirmed";
  const str = (v: unknown, max = 240): string | undefined => {
    const s = typeof v === "string" ? v.trim() : "";
    return s ? s.slice(0, max) : undefined;
  };
  return {
    name: c.name,
    verdict,
    reason: str(raw.reason, 300) ?? "no reason given",
    address: str(raw.address),
    phone: str(raw.phone, 40),
    website: str(raw.website) ?? c.website,
    priceTier: (["$", "$$", "$$$", "$$$$"] as const).find((t) => t === raw.priceTier),
    knownFor: str(raw.knownFor),
    catersTo: str(raw.catersTo),
    howToBuy: str(raw.howToBuy),
    checkedAt: new Date().toISOString().slice(0, 10),
  };
}

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

(async () => {
  const all = JSON.parse(fs.readFileSync(IN_PATH, "utf8")) as Candidate[] | { stores: Candidate[] };
  const candidates = Array.isArray(all) ? all : all.stores;
  const force = process.argv.includes("--force");
  const includeChains = process.argv.includes("--all");

  const existing: Verified[] = fs.existsSync(OUT_PATH) && !force
    ? (JSON.parse(fs.readFileSync(OUT_PATH, "utf8")) as Verified[])
    : [];
  const done = new Set(existing.map((v) => v.name));

  const todo = candidates
    .filter((c) => includeChains || !SKIP.some((s) => c.name.startsWith(s)))
    .filter((c) => !done.has(c.name));

  console.log(
    `[verify] ${todo.length} candidate(s) to check` +
      (done.size ? `, ${done.size} already on file` : "") +
      (includeChains ? "" : `, ${SKIP.length} chains skipped`),
  );
  if (todo.length === 0) {
    console.log("[verify] nothing to do. Pass --force to re-check.");
    return;
  }

  let outOfCredit = false;
  const results = await pool(todo, 3, async (c) => {
    if (outOfCredit) return null;
    try {
      const v = await verify(c);
      const mark = v.verdict === "confirmed" ? "OK  " : v.verdict === "closed" ? "SHUT" : "??  ";
      console.log(`  ${mark} ${c.name}: ${v.reason.slice(0, 100)}`);
      return v;
    } catch (err) {
      const msg = (err as Error).message ?? "";
      if (/credit balance is too low/i.test(msg)) {
        if (!outOfCredit) console.error("  [verify] STOPPING: out of API credits. Partial results saved.");
        outOfCredit = true;
      } else {
        console.warn(`  FAIL ${c.name}: ${msg.slice(0, 90)}`);
      }
      return null;
    }
  });

  const merged = [...existing, ...results.filter((r): r is Verified => r !== null)];
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(merged, null, 2));

  const by = (v: Verified["verdict"]) => merged.filter((m) => m.verdict === v).length;
  console.log(
    `\n[verify] ${by("confirmed")} confirmed, ${by("unconfirmed")} unconfirmed, ${by("closed")} closed → ${path.relative(process.cwd(), OUT_PATH)}`,
  );
  console.log("[verify] Nothing was added to the directory. Read the file first.");
})();
