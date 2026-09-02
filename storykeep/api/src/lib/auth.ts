import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { id, one, query } from "./db";
import { SESSION_SECRET, IS_PROD } from "../config";

const SESSION_DAYS = 30;
export const COOKIE_NAME = "sk_session";

export interface AuthedUser {
  id: string;
  email: string;
  display_name: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * The cookie carries `<sessionId>.<hmac>`. The HMAC means a stolen or guessed
 * session id alone is useless without the server secret, and it lets us reject
 * a forged cookie without a database round trip.
 */
function sign(sessionId: string): string {
  const mac = crypto.createHmac("sha256", SESSION_SECRET).update(sessionId).digest("base64url");
  return `${sessionId}.${mac}`;
}

function unsign(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const sessionId = value.slice(0, dot);
  const expected = sign(sessionId);
  // Constant-time compare: a fast-failing string compare leaks the prefix.
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return sessionId;
}

export async function createSession(res: Response, userId: string): Promise<void> {
  const sessionId = id("ses");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await query(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`,
    [sessionId, userId, expires],
  );
  res.cookie(COOKIE_NAME, sign(sessionId), {
    httpOnly: true,
    secure: IS_PROD,
    // The web app and the API sit on different hosts (Vercel and Render), so
    // the session cookie is inherently cross-site and must say so. `lax`
    // would silently drop it on every XHR in production.
    sameSite: IS_PROD ? "none" : "lax",
    maxAge: SESSION_DAYS * 86_400_000,
    path: "/",
  });
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const sessionId = unsign(req.cookies?.[COOKIE_NAME]);
  if (sessionId) await query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

/** Populates req.user when a valid session cookie is present. Never rejects. */
export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const sessionId = unsign(req.cookies?.[COOKIE_NAME]);
    if (sessionId) {
      const row = await one<AuthedUser & { expires_at: Date }>(
        `SELECT u.id, u.email, u.display_name, s.expires_at
           FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.id = $1`,
        [sessionId],
      );
      if (row && new Date(row.expires_at).getTime() > Date.now()) {
        req.user = { id: row.id, email: row.email, display_name: row.display_name };
      }
    }
  } catch {
    // A database hiccup must not turn every page into a 500 — it turns the
    // request into an anonymous one, and the route below decides what that means.
  }
  next();
}

/** Route guard. Use on everything that touches somebody's book. */
export function requireUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Please sign in." });
    return;
  }
  next();
}
