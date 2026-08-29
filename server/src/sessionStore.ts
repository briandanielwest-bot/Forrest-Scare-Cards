import { randomUUID } from "crypto";
import type { SessionState } from "./types";

/**
 * In-memory session store. Fine for a demo/single-instance app; swap for
 * Redis/Postgres before running multiple server instances or persisting
 * sessions across restarts.
 */
const sessions = new Map<string, SessionState>();

export function createSession(): SessionState {
  const session: SessionState = {
    id: randomUUID(),
    createdAt: Date.now(),
    interviewHistory: [],
    interviewComplete: false,
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): SessionState | undefined {
  return sessions.get(id);
}

export function requireSession(id: string): SessionState {
  const session = sessions.get(id);
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
