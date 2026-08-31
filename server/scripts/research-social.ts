/**
 * Store social handles — the modern storefront window.
 *
 * Finds each store's official Instagram and Facebook profile URLs so the
 * app can link to them. A store's Instagram is where a man actually
 * decides whether a place is for him, and it's usually fresher than the
 * store's own website.
 *
 * DELIBERATE SCOPE: public profile URLs only. We do not scrape, parse, or
 * store feed content — that violates platform terms, breaks constantly,
 * and duplicates what the monthly refresh already surfaces about sales
 * and trunk shows. Links point people to the source; they don't copy it.
 *
 * Writes src/data/storeSocial.ts (generated).
 * Usage: cd server && npx ts-node --transpile-only scripts/research-social.ts
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { HOUSTON_STORES } from "../src/data/houstonStores";

const anthropic = new Anthropic();
const MODEL = process.env.ANTHROPIC_FAST_MODEL ?? "claude-sonnet-5";
const WEB_SEARCH = { type: "web_search_20260209", name: "web_search", max_uses: 4 } as const;

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

function extractJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`no JSON object in: ${text.slice(0, 200)}`);
  return JSON.parse(match[0]) as T;
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

export interface StoreSocial {
  /** @handle for the store's official Instagram, no leading @. */
  instagram?: string;
  /** Full Facebook page URL. */
  facebook?: string;
  /** Whether the account appears actively posted to (last ~3 months). */
  active?: boolean;
}

// A national brand's global account is not the Houston store's account;
// prefer a location-specific handle and say so when only global exists.
async function findSocial(store: (typeof HOUSTON_STORES)[number]): Promise<StoreSocial> {
  const text = await runWithSearch(
    "You verify business social profiles with web search and answer ONLY with a single JSON object. Never guess a handle — a wrong handle sends customers to a stranger's account.",
    `Find the official social profiles for this Houston store:
Name: ${store.name}
Area: ${store.neighborhood}
Website: ${store.website}

Rules:
- Only report a handle you can confirm belongs to THIS business (linked from their own website, or an account that clearly matches the business name and location).
- For national brands, prefer a Houston-location-specific account if one exists; otherwise the brand's main account is acceptable.
- Report whether the account looks actively posted to within roughly the last three months.
- Omit anything you cannot confirm. An empty field is correct; a wrong handle is harmful.

Answer ONLY this JSON:
{"instagram": "<handle without @, or empty string>", "facebook": "<full facebook page url, or empty string>", "active": true|false}`,
    1500,
  );
  const raw = extractJson<{ instagram?: unknown; facebook?: unknown; active?: unknown }>(text);
  const handle = typeof raw.instagram === "string" ? raw.instagram.trim().replace(/^@+/, "").replace(/\s+/g, "") : "";
  const fb = typeof raw.facebook === "string" ? raw.facebook.trim() : "";
  return {
    instagram: /^[A-Za-z0-9._]{1,40}$/.test(handle) ? handle : undefined,
    facebook: /^https?:\/\/(www\.)?facebook\.com\//i.test(fb) ? fb.slice(0, 200) : undefined,
    active: typeof raw.active === "boolean" ? raw.active : undefined,
  };
}

async function main() {
  console.log(`[social] finding profiles for ${HOUSTON_STORES.length} stores…`);
  const social: Record<string, StoreSocial> = {};
  const results = await pool(HOUSTON_STORES, 4, async (store) => {
    try {
      const s = await findSocial(store);
      console.log(`  ${store.id}: ${s.instagram ? "@" + s.instagram : "no IG"}${s.facebook ? " + FB" : ""}`);
      return [store.id, s] as const;
    } catch (err) {
      console.warn(`  ${store.id}: FAILED (${(err as Error).message.slice(0, 60)})`);
      return [store.id, {} as StoreSocial] as const;
    }
  });
  for (const [id, s] of results) {
    if (s.instagram || s.facebook) social[id] = s;
  }

  fs.writeFileSync(
    path.join(__dirname, "..", "src", "data", "storeSocial.ts"),
    `// GENERATED by scripts/research-social.ts on ${new Date().toISOString().slice(0, 10)} — do not hand-edit.
// Official public social profile links per store. Links only, by design:
// we point people at the source, we never copy its content.
export interface StoreSocial {
  instagram?: string;
  facebook?: string;
  active?: boolean;
}

export const STORE_SOCIAL: Record<string, StoreSocial> = ${JSON.stringify(social, null, 2)};
`,
  );
  const ig = Object.values(social).filter((s) => s.instagram).length;
  console.log(`[social] ${Object.keys(social).length} stores with profiles (${ig} Instagram) → src/data/storeSocial.ts`);
}

main().catch((err) => {
  console.error("[social] FAILED:", err);
  process.exit(1);
});
