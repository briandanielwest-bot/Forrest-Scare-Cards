import "dotenv/config";

export const PORT = Number(process.env.PORT ?? 4000);

// Every agent shares one model — swap here to tune cost/quality app-wide.
export const AGENT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
