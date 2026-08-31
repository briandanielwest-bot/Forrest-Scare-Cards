import { Pool } from "pg";

/**
 * Optional Postgres persistence.
 *
 * Set DATABASE_URL and the app stores sessions, claim-code memories, and
 * analytics events in Postgres — surviving restarts, redeploys, and
 * multiple server instances. Leave it unset and everything falls back to
 * the in-memory + file storage that has always worked, so local dev and
 * a free-tier deploy need no database at all.
 *
 * On Render: create a Postgres instance, copy its Internal Database URL
 * into the web service's DATABASE_URL environment variable, redeploy.
 * Nothing else to configure — tables are created on boot.
 */

const connectionString = process.env.DATABASE_URL;

// Managed Postgres (Render, Heroku, Supabase) terminates TLS with certs
// that don't chain to the system store from inside the container.
const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? undefined : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
    })
  : null;

let ready = false;

export function isDbEnabled(): boolean {
  return pool !== null && ready;
}

/** Creates tables if absent. Safe to call repeatedly; never throws. */
export async function initDb(): Promise<void> {
  if (!pool) {
    console.log("[db] DATABASE_URL not set — using in-memory sessions and file storage");
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS memories (
        code TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS events (
        id BIGSERIAL PRIMARY KEY,
        at TIMESTAMPTZ NOT NULL DEFAULT now(),
        event TEXT NOT NULL,
        props JSONB NOT NULL DEFAULT '{}'::jsonb
      );
      CREATE INDEX IF NOT EXISTS events_event_idx ON events (event);
      CREATE INDEX IF NOT EXISTS sessions_updated_idx ON sessions (updated_at);
    `);
    ready = true;
    console.log("[db] Postgres connected — sessions, claim codes, and analytics are persistent");
  } catch (err) {
    // A database problem must never take the product down: log it loudly
    // and keep serving from memory and disk.
    console.error(`[db] connection failed (${(err as Error).message.slice(0, 120)}) — falling back to memory/files`);
    ready = false;
  }
}

export async function query<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (!pool || !ready) throw new Error("database not available");
  const result = await pool.query(text, params);
  return result.rows as T[];
}

/** Sweeps sessions untouched for a day — plans live on in claim codes. */
export async function pruneOldSessions(): Promise<void> {
  if (!isDbEnabled()) return;
  try {
    await query("DELETE FROM sessions WHERE updated_at < now() - interval '24 hours'");
  } catch {
    // Housekeeping only.
  }
}
