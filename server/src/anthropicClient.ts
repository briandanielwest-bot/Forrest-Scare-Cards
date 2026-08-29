import Anthropic from "@anthropic-ai/sdk";

// Resolves ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN / an `ant auth login`
// profile) from the environment automatically — never hardcode a key here.
export const anthropic = new Anthropic();
