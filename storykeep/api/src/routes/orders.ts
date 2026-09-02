import { Router } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { id, one, query } from "../lib/db";
import { requireUser } from "../lib/auth";
import { ownedBook } from "./guards";
import { PAYMENTS_ENABLED, PUBLIC_WEB_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from "../config";
import { PRICES, type PriceKey } from "./pricing";
import { BRAND } from "../brand";

export const ordersRouter = Router({ mergeParams: true });

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

ordersRouter.get("/prices", (_req, res) => {
  res.json({ prices: PRICES, paymentsEnabled: PAYMENTS_ENABLED });
});

ordersRouter.post("/checkout", requireUser, ownedBook, async (req, res, next) => {
  try {
    const parsed = z.object({ kind: z.enum(["export", "print", "animation"]) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Unknown item." });
      return;
    }
    const kind: PriceKey = parsed.data.kind;
    const price = PRICES[kind];
    const orderId = id("ord");

    await query(
      `INSERT INTO orders (id, book_id, user_id, kind, status, amount_cents)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [orderId, req.params.bookId, req.user!.id, kind, PAYMENTS_ENABLED ? "pending" : "paid", price.amount],
    );

    // With no Stripe key configured the order is marked paid immediately.
    // That is the correct behaviour for a development deploy and for showing
    // the product to someone — not a bypass, because PAYMENTS_ENABLED is
    // exactly "is there a key", and there is no gate to bypass without one.
    if (!stripe) {
      res.json({ orderId, free: true });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: req.user!.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: price.amount,
            product_data: { name: `${price.label} — ${BRAND.name}`, description: price.blurb },
          },
        },
      ],
      // The order id travels with the session so the webhook can settle the
      // right row without trusting anything the browser sends back.
      client_reference_id: orderId,
      metadata: { orderId, bookId: req.params.bookId, kind },
      success_url: `${PUBLIC_WEB_URL}/book/${req.params.bookId}/finish?paid=1`,
      cancel_url: `${PUBLIC_WEB_URL}/book/${req.params.bookId}/finish?paid=0`,
    });

    await query(`UPDATE orders SET stripe_id = $2 WHERE id = $1`, [orderId, session.id]);
    res.json({ orderId, url: session.url });
  } catch (err) {
    next(err);
  }
});

ordersRouter.get("/", requireUser, ownedBook, async (req, res) => {
  const orders = await query(
    `SELECT id, kind, status, amount_cents, created_at FROM orders WHERE book_id = $1 ORDER BY created_at DESC`,
    [req.params.bookId],
  );
  res.json({ orders });
});

/**
 * The animation upsell is fulfilled by a person, not a pipeline.
 *
 * Deliberately so, for now: an automated video renderer is a second product
 * with its own queue, storage and failure modes, and nobody has yet proved
 * customers want it enough to pay. This captures the order and the brief; if
 * the orders arrive, that is when the pipeline gets built.
 */
ordersRouter.post("/animation-brief", requireUser, ownedBook, async (req, res) => {
  const parsed = z
    .object({
      notes: z.string().trim().max(4000).optional(),
      narrationVoice: z.enum(["author", "professional", "none"]).default("author"),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const order = await one<{ id: string }>(
    `SELECT id FROM orders WHERE book_id = $1 AND kind = 'animation' AND status IN ('paid','pending')
      ORDER BY created_at DESC LIMIT 1`,
    [req.params.bookId],
  );
  if (!order) {
    res.status(400).json({ error: "Order the animation first." });
    return;
  }

  await query(`UPDATE orders SET detail = detail || $2::jsonb WHERE id = $1`, [
    order.id,
    JSON.stringify({ notes: parsed.data.notes ?? "", narrationVoice: parsed.data.narrationVoice }),
  ]);
  res.json({ ok: true, contact: BRAND.supportEmail });
});

/**
 * Stripe's webhook.
 *
 * Mounted with a raw body parser in index.ts, because signature verification
 * runs over the exact bytes Stripe sent — a JSON round trip through
 * express.json() changes them and every signature check then fails.
 */
export async function handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) return;

  const event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  if (event.type !== "checkout.session.completed") return;

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.client_reference_id ?? session.metadata?.orderId;
  if (!orderId) return;

  await query(`UPDATE orders SET status = 'paid' WHERE id = $1 AND status <> 'paid'`, [orderId]);
}
