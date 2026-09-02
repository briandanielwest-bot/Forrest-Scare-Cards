import "dotenv/config";
import crypto from "crypto";

export const PORT = Number(process.env.PORT ?? 4000);
export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
export const PUBLIC_WEB_URL = process.env.PUBLIC_WEB_URL ?? "http://localhost:3000";
export const IS_PROD = process.env.NODE_ENV === "production";

/**
 * The craft models.
 *
 * Prose quality IS the product here, so the writing agents run on the most
 * capable model. The bookkeeping agents — the ones that extract facts from a
 * transcript, diff a timeline, or count syllables — do structured reads where
 * a faster model is indistinguishable and roughly a third of the price.
 */
export const CRAFT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";
export const UTILITY_MODEL = process.env.ANTHROPIC_FAST_MODEL ?? "claude-sonnet-5";

export const ANTHROPIC_WORKSPACE_ID = process.env.ANTHROPIC_WORKSPACE_ID;

/**
 * Session signing key. A random fallback keeps local dev frictionless but
 * invalidates every cookie on restart — which is why .env.example tells you
 * to set it, and why we say so loudly at boot in production.
 */
export const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
export const SESSION_SECRET_IS_EPHEMERAL = !process.env.SESSION_SECRET;

const optionalNumber = (key: string): number | undefined => {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

/** Global daily Claude spend ceiling, USD. Undefined means no ceiling. */
export const DAILY_LIMIT_USD = optionalNumber("DAILY_LIMIT_USD");
/** Per-author monthly Claude spend ceiling, USD. Undefined means no ceiling. */
export const USER_MONTHLY_LIMIT_USD = optionalNumber("USER_MONTHLY_LIMIT_USD");

export const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
export const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
export const REPLICATE_IMAGE_MODEL =
  process.env.REPLICATE_IMAGE_MODEL ?? "black-forest-labs/flux-1.1-pro";
export const IMAGE_PROVIDER = process.env.IMAGE_PROVIDER ?? "replicate";

export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
/** With no Stripe key configured, exports unlock for free. */
export const PAYMENTS_ENABLED = Boolean(STRIPE_SECRET_KEY);
