import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_WORKSPACE_ID } from "./config";

// Resolves ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN / an `ant auth login`
// profile) from the environment automatically — never hardcode a key here.
export const anthropic = new Anthropic(
  ANTHROPIC_WORKSPACE_ID ? { defaultHeaders: { "anthropic-workspace-id": ANTHROPIC_WORKSPACE_ID } } : undefined,
);

export type EffortLevel = "low" | "medium" | "high" | "xhigh" | "max";

// The installed @anthropic-ai/sdk version doesn't type output_config.effort
// yet, even though the API accepts it (confirmed live). This intersection
// type adds it back without losing type-checking on everything else, and
// without an `any` cast on the request. Default effort is "high" — only
// pass this where a call genuinely benefits from being faster/cheaper.
export type WithEffort<T> = T & { output_config?: { effort: EffortLevel } };
