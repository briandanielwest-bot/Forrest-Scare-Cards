import * as fs from "fs";
import * as path from "path";
import { randomBytes } from "crypto";
import { isDbEnabled, query } from "./db";
import type Anthropic from "@anthropic-ai/sdk";
import type { PhotoAssessment, StyleProfile, WardrobePlan } from "./types";

/**
 * Claim-code memory: guest-by-default persistence without accounts.
 * "Save my plan" issues a human-readable code (BB-XK42-9QDP); entering it
 * later restores the profile + plan on any device and re-arms Kyla's
 * plan chat in a fresh session.
 *
 * Storage is one JSON file per code under DATA_DIR (defaults to
 * server/.data). On hosts without a persistent disk this survives
 * restarts but not redeploys — mount a disk and point DATA_DIR at it
 * (e.g. Render: add a disk, set DATA_DIR=/var/data) for true
 * permanence. Zero native dependencies by design.
 */

const DATA_DIR = process.env.DATA_DIR ?? path.join(__dirname, "..", ".data");

export interface MemoryRecord {
  code: string;
  createdAt: string;
  updatedAt: string;
  styleProfile: StyleProfile | null;
  wardrobePlan: WardrobePlan | null;
  purchasedKeys: string[];
  /** Full dossier: everything a returning customer expects Kyla to remember. */
  photoAssessment?: PhotoAssessment;
  planQAHistory?: Anthropic.MessageParam[];
  outfits?: { name: string; occasion: string; pieces: string[] }[];
}

// No lookalike characters (0/O, 1/I/L) — these get read over the phone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function generateCode(): string {
  const pick = (n: number) =>
    Array.from(randomBytes(n))
      .map((b) => ALPHABET[b % ALPHABET.length])
      .join("");
  return `BB-${pick(4)}-${pick(4)}`;
}

function codePath(code: string): string {
  // Codes are generated from a fixed alphabet; sanitize anyway so a
  // hand-typed lookup can never traverse paths.
  return path.join(DATA_DIR, `${code.replace(/[^A-Z0-9-]/gi, "")}.json`);
}

function ensureDir(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export async function saveMemoryRecord(record: {
  styleProfile: StyleProfile | null;
  wardrobePlan: WardrobePlan | null;
  purchasedKeys: string[];
  existingCode?: string;
  photoAssessment?: PhotoAssessment;
  planQAHistory?: Anthropic.MessageParam[];
  outfits?: { name: string; occasion: string; pieces: string[] }[];
}): Promise<MemoryRecord> {
  const now = new Date().toISOString();
  // Re-saving with a valid existing code updates in place (progress sync).
  const prior = record.existingCode ? await loadMemoryRecord(record.existingCode) : null;
  const code = prior?.code ?? generateCode();
  const full: MemoryRecord = {
    code,
    createdAt: prior?.createdAt ?? now,
    updatedAt: now,
    styleProfile: record.styleProfile,
    wardrobePlan: record.wardrobePlan,
    purchasedKeys: record.purchasedKeys ?? [],
    photoAssessment: record.photoAssessment ?? prior?.photoAssessment,
    planQAHistory: record.planQAHistory ?? prior?.planQAHistory,
    outfits: record.outfits ?? prior?.outfits,
  };
  if (isDbEnabled()) {
    try {
      await query(
        `INSERT INTO memories (code, data, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (code) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        [code, JSON.stringify(full)],
      );
      return full;
    } catch (err) {
      console.warn(`[memory] db save failed (${(err as Error).message.slice(0, 80)}) — writing to disk`);
    }
  }
  ensureDir();
  fs.writeFileSync(codePath(code), JSON.stringify(full));
  return full;
}

export async function loadMemoryRecord(code: string): Promise<MemoryRecord | null> {
  const normalized = code.trim().toUpperCase();
  if (isDbEnabled()) {
    try {
      const rows = await query<{ data: MemoryRecord }>("SELECT data FROM memories WHERE code = $1", [normalized]);
      if (rows.length > 0) return rows[0].data;
    } catch (err) {
      console.warn(`[memory] db load failed (${(err as Error).message.slice(0, 80)}) — trying disk`);
    }
  }
  try {
    const raw = fs.readFileSync(codePath(normalized), "utf8");
    return JSON.parse(raw) as MemoryRecord;
  } catch {
    return null;
  }
}
