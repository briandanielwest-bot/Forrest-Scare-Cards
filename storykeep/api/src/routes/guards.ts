import type { NextFunction, Request, Response } from "express";
import { one } from "../lib/db";

/**
 * Ownership check, applied to every route carrying a :bookId.
 *
 * Written as its own middleware rather than a WHERE clause in each handler
 * because there are a dozen handlers and the one that forgets the clause is
 * the one that leaks somebody's memoir.
 */
export async function ownedBook(req: Request, res: Response, next: NextFunction): Promise<void> {
  const row = await one<{ user_id: string }>(`SELECT user_id FROM books WHERE id = $1`, [
    req.params.bookId,
  ]);
  if (!row) {
    res.status(404).json({ error: "That book doesn't exist." });
    return;
  }
  if (row.user_id !== req.user?.id) {
    // 404 rather than 403: a 403 confirms the book exists.
    res.status(404).json({ error: "That book doesn't exist." });
    return;
  }
  next();
}
