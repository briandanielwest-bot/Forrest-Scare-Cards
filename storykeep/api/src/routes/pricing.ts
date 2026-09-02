import { one } from "../lib/db";

/**
 * What things cost, in cents.
 *
 * Free to write, pay to take it away. Someone who has spent six weeks talking
 * to Wren about their father is not going to abandon the book at the download
 * button — and asking for money before they have seen a page of their own
 * story would lose almost all of them.
 */
export const PRICES = {
  export: { amount: 4900, label: "Unlock your book", blurb: "Print-ready PDF, EPUB and Word file. Yours forever, re-download any time." },
  print: { amount: 8900, label: "A printed hardcover", blurb: "One copy of the finished book, printed and posted to you." },
  animation: {
    amount: 29900,
    label: "Animate it",
    blurb: "We turn your illustrated book into a narrated animated short, read in your own recorded voice.",
  },
} as const;

export type PriceKey = keyof typeof PRICES;

export async function hasPaidFor(bookId: string, kind: PriceKey): Promise<boolean> {
  const row = await one<{ id: string }>(
    `SELECT id FROM orders WHERE book_id = $1 AND kind = $2 AND status = 'paid' LIMIT 1`,
    [bookId, kind],
  );
  return Boolean(row);
}
