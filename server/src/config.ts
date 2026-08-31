import "dotenv/config";

export const PORT = Number(process.env.PORT ?? 4000);

// The wardrobe planner runs on the most capable model — it carries the
// budget arithmetic and the final synthesis, and downgrading it was tried
// and reverted earlier (wrong budget math at lower settings).
export const AGENT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

// The conversational/extraction agents (interviewer, photo analyst, store
// scouts, almanac) run on a faster model — their jobs are chat turns and
// structured reads where speed IS the feature. Override with
// ANTHROPIC_FAST_MODEL to experiment.
export const FAST_AGENT_MODEL = process.env.ANTHROPIC_FAST_MODEL ?? "claude-sonnet-5";

export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

// Only needed for a personal/service-account API key that isn't scoped to a
// single workspace — such a key requires every request to say which
// workspace it acts in. A key created scoped to one workspace doesn't need
// this. See server/.env.example.
export const ANTHROPIC_WORKSPACE_ID = process.env.ANTHROPIC_WORKSPACE_ID;
