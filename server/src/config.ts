import "dotenv/config";

export const PORT = Number(process.env.PORT ?? 4000);

// Every agent shares one model — swap here to tune cost/quality app-wide.
export const AGENT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

// Only needed for a personal/service-account API key that isn't scoped to a
// single workspace — such a key requires every request to say which
// workspace it acts in. A key created scoped to one workspace doesn't need
// this. See server/.env.example.
export const ANTHROPIC_WORKSPACE_ID = process.env.ANTHROPIC_WORKSPACE_ID;
