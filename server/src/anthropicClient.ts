import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_WORKSPACE_ID } from "./config";

// Resolves ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN / an `ant auth login`
// profile) from the environment automatically — never hardcode a key here.
export const anthropic = new Anthropic(
  ANTHROPIC_WORKSPACE_ID ? { defaultHeaders: { "anthropic-workspace-id": ANTHROPIC_WORKSPACE_ID } } : undefined,
);
