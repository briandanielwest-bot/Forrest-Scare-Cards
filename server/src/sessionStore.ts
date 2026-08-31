import { randomUUID } from "crypto";
import type { SessionState } from "./types";
import { isDbEnabled, query } from "./db";

/**
 * Session store: an in-memory map that writes through to Postgres when
 * DATABASE_URL is configured.
 *
 * Without a database this behaves exactly as it always has — fast, and
 * lost on restart. With one, a restart, redeploy, or a second server
 * instance no longer costs a man his half-finished interview: the map is
 * a hot cache, Postgres is the truth.
 */
const sessions = new Map<string, SessionState>();

// Fire-and-forget: persistence must never add latency to a chat turn or
// break a request when the database hiccups.
function persist(session: SessionState): void {
  if (!isDbEnabled()) return;
  void query(
    `INSERT INTO sessions (id, data, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [session.id, JSON.stringify(session)],
  ).catch((err) => {
    console.warn(`[sessions] persist failed (${(err as Error).message.slice(0, 80)})`);
  });
}

export function createSession(): SessionState {
  const session: SessionState = {
    id: randomUUID(),
    createdAt: Date.now(),
    interviewHistory: [],
    interviewComplete: false,
    photoStatus: "idle",
    planStatus: "idle",
  };
  sessions.set(session.id, session);
  persist(session);
  return session;
}

/**
 * Call after mutating a session that must survive a restart — the end of
 * an interview turn, a finished plan, a photo assessment.
 */
export function saveSession(session: SessionState): void {
  sessions.set(session.id, session);
  persist(session);
}

export async function getSession(id: string): Promise<SessionState | undefined> {
  const cached = sessions.get(id);
  if (cached) return cached;
  if (!isDbEnabled()) return undefined;
  try {
    const rows = await query<{ data: SessionState }>("SELECT data FROM sessions WHERE id = $1", [id]);
    if (rows.length === 0) return undefined;
    // Rehydrate into the hot cache so the next read is instant.
    const session = rows[0].data;
    sessions.set(id, session);
    return session;
  } catch (err) {
    console.warn(`[sessions] load failed (${(err as Error).message.slice(0, 80)})`);
    return undefined;
  }
}

export async function requireSession(id: string): Promise<SessionState> {
  const session = await getSession(id);
  if (!session) {
    throw new SessionNotFoundError(id);
  }
  return session;
}

export class SessionNotFoundError extends Error {
  constructor(id: string) {
    super(`No session found for id "${id}"`);
    this.name = "SessionNotFoundError";
  }
}
