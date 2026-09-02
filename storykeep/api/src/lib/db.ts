import { Pool, type QueryResultRow } from "pg";
import crypto from "crypto";
import { SCHEMA_SQL } from "./schema";

/**
 * Postgres is required, deliberately.
 *
 * An in-memory fallback would make `npm run dev` friendlier and would also,
 * one day, silently eat somebody's grandmother's memoir. A book app whose
 * storage layer is optional is not a book app. If DATABASE_URL is missing we
 * refuse to start and say exactly how to get one.
 */
const url = process.env.DATABASE_URL;

export const pool = url
  ? new Pool({
      connectionString: url,
      // Render's managed Postgres presents a certificate signed by a CA the
      // Node image doesn't carry. Verification is therefore off for the
      // managed host only; a self-hosted URL keeps full verification.
      ssl: /render\.com|neon\.tech|supabase\.co/.test(url)
        ? { rejectUnauthorized: false }
        : undefined,
      max: 8,
      idleTimeoutMillis: 30_000,
    })
  : null;

export function requireDb(): Pool {
  if (!pool) {
    throw new Error(
      "DATABASE_URL is not set. Storykeep stores people's life stories; it will not " +
        "run on memory that a restart erases.\n\n" +
        "Local Postgres in one command:\n" +
        "  docker run --name storykeep-db -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:16\n" +
        "  DATABASE_URL=postgres://postgres:dev@localhost:5432/postgres\n",
    );
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await requireDb().query<T>(text, params);
  return result.rows;
}

export async function one<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Applied on every boot. Every statement is IF NOT EXISTS, so it is a no-op once settled. */
export async function migrate(): Promise<void> {
  await requireDb().query(SCHEMA_SQL);
}

/**
 * Short, URL-safe, sortable-enough ids. Prefixed so a stray id in a log line
 * says what it is without a lookup.
 */
export function id(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString("base64url")}`;
}
