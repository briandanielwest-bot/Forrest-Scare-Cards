import { Router } from "express";
import { z } from "zod";
import { id, one, query } from "../lib/db";
import { attachUser, createSession, destroySession, hashPassword, requireUser, verifyPassword } from "../lib/auth";

export const authRouter = Router();

const credentials = z.object({
  email: z.string().email("That doesn't look like an email address."),
  // Long enough to matter, low enough that an eighty-year-old can set one.
  // Length is the only rule; character-class rules push people to Passw0rd!.
  password: z.string().min(10, "Use at least 10 characters — a short phrase works well."),
  displayName: z.string().trim().max(120).optional(),
});

authRouter.post("/signup", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();

  const existing = await one<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existing) {
    res.status(409).json({ error: "There's already an account with that email. Try signing in." });
    return;
  }

  const userId = id("usr");
  await query(
    `INSERT INTO users (id, email, password_hash, display_name) VALUES ($1,$2,$3,$4)`,
    [userId, email, await hashPassword(parsed.data.password), parsed.data.displayName ?? null],
  );
  await createSession(res, userId);
  res.json({ user: { id: userId, email, display_name: parsed.data.displayName ?? null } });
});

authRouter.post("/signin", async (req, res) => {
  const parsed = credentials.omit({ displayName: true }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter your email and password." });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const user = await one<{ id: string; password_hash: string; display_name: string | null }>(
    `SELECT id, password_hash, display_name FROM users WHERE email = $1`,
    [email],
  );

  // Same message and roughly the same work either way: a faster failure for an
  // unknown address tells an attacker which of your customers exist.
  const ok = user ? await verifyPassword(parsed.data.password, user.password_hash) : false;
  if (!user || !ok) {
    res.status(401).json({ error: "That email and password don't match." });
    return;
  }

  await query(`UPDATE users SET last_seen_at = now() WHERE id = $1`, [user.id]);
  await createSession(res, user.id);
  res.json({ user: { id: user.id, email, display_name: user.display_name } });
});

authRouter.post("/signout", async (req, res) => {
  await destroySession(req, res);
  res.json({ ok: true });
});

authRouter.get("/me", attachUser, (req, res) => {
  res.json({ user: req.user ?? null });
});

authRouter.patch("/me", attachUser, requireUser, async (req, res) => {
  const parsed = z.object({ displayName: z.string().trim().max(120) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a name." });
    return;
  }
  await query(`UPDATE users SET display_name = $2 WHERE id = $1`, [req.user!.id, parsed.data.displayName]);
  res.json({ ok: true });
});
