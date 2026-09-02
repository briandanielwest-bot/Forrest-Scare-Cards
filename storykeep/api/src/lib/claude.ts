import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_WORKSPACE_ID, CRAFT_MODEL, UTILITY_MODEL } from "../config";
import { recordSpend } from "./spend";

export const anthropic = new Anthropic(
  ANTHROPIC_WORKSPACE_ID
    ? { defaultHeaders: { "anthropic-workspace-id": ANTHROPIC_WORKSPACE_ID } }
    : undefined,
);

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * The installed @anthropic-ai/sdk (0.71) predates four fields the API accepts
 * and this service depends on: adaptive thinking, `output_config.effort`,
 * `strict` on a tool, and `stop_details` on a refusal.
 *
 * These intersection types add them back at the one boundary where the request
 * is built, rather than scattering `as any` through every agent. When the SDK
 * types catch up, delete this block and nothing else changes.
 */
type AdaptiveThinking = { type: "adaptive"; display?: "summarized" | "omitted" };
type OutputConfig = { effort?: Effort };
type StrictTool = Anthropic.Tool & { strict?: boolean };

type Extended<T> = Omit<T, "thinking" | "tools"> & {
  thinking?: AdaptiveThinking;
  output_config?: OutputConfig;
  tools?: StrictTool[];
};

type RefusalAware = Anthropic.Message & {
  stop_details?: { type?: string; category?: string | null; explanation?: string } | null;
};

export interface RunContext {
  /** Whose budget this call comes out of. */
  userId?: string;
  bookId?: string;
  /** Which agent is spending, so the cost report reads like the org chart. */
  agent: string;
}

interface BaseOptions extends RunContext {
  /**
   * Everything stable about the call: the agent's persona, the craft rules,
   * the book's style bible. This is the cached prefix, so it must not contain
   * a timestamp, a request id, or anything else that changes per call —
   * see the note on cacheable() below.
   */
  system: string;
  messages: Anthropic.MessageParam[];
  model?: string;
  maxTokens?: number;
  effort?: Effort;
}

/**
 * Marks the system prompt as cacheable.
 *
 * The craft agents carry a large, identical preamble on every call — the
 * genre playbook, the voice fingerprint, the story ledger. Caching it turns
 * that from full price on every chapter into a tenth of the price on every
 * chapter after the first, which is most of the difference between a memoir
 * costing $8 in API spend and costing $30.
 */
function cacheable(system: string): Anthropic.TextBlockParam[] {
  return [{ type: "text", text: system, cache_control: { type: "ephemeral" } }];
}

function usageOf(usage: Anthropic.Usage) {
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  };
}

/**
 * Prose. Streamed, because a chapter can run tens of thousands of tokens and
 * a non-streamed request that long hits the SDK's HTTP timeout.
 */
export async function runText(opts: BaseOptions): Promise<string> {
  const model = opts.model ?? CRAFT_MODEL;
  const params: Extended<Anthropic.MessageStreamParams> = {
    model,
    max_tokens: opts.maxTokens ?? 32_000,
    system: cacheable(opts.system),
    messages: opts.messages,
    thinking: { type: "adaptive" },
    output_config: { effort: opts.effort ?? "high" },
  };
  const stream = anthropic.messages.stream(params as Anthropic.MessageStreamParams);
  const message = (await stream.finalMessage()) as RefusalAware;
  await recordSpend({ ...opts, model, ...usageOf(message.usage) });

  if (String(message.stop_reason) === "refusal") {
    throw new AgentRefusal(
      message.stop_details?.explanation ?? "The writing agent declined this request.",
    );
  }
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/**
 * Structured reads — extraction, grading, outlining.
 *
 * Implemented as one strict tool with a forced choice rather than free-text
 * JSON, so the result is schema-valid by construction and there is no parse
 * step that can fail at 2am on a customer's chapter.
 */
export async function runJson<T>(
  opts: BaseOptions & { schema: Record<string, unknown>; toolName?: string; toolDescription?: string },
): Promise<T> {
  const model = opts.model ?? UTILITY_MODEL;
  const name = opts.toolName ?? "record";
  const params: Extended<Anthropic.MessageCreateParamsNonStreaming> = {
    model,
    max_tokens: opts.maxTokens ?? 8_000,
    system: cacheable(opts.system),
    messages: opts.messages,
    thinking: { type: "adaptive" },
    output_config: { effort: opts.effort ?? "medium" },
    tools: [
      {
        name,
        description: opts.toolDescription ?? "Record the result.",
        strict: true,
        input_schema: opts.schema as Anthropic.Tool.InputSchema,
      },
    ],
    // Forcing the call is what makes the result schema-valid by construction.
    // Supported on Opus 5 and Sonnet 5; Fable-tier models reject it.
    tool_choice: { type: "tool", name },
  };
  const message = await anthropic.messages.create(
    params as Anthropic.MessageCreateParamsNonStreaming,
  );
  await recordSpend({ ...opts, model, ...usageOf(message.usage) });

  const call = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === name,
  );
  if (!call) throw new AgentRefusal("The agent returned no structured result.");
  return call.input as T;
}

export class AgentRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentRefusal";
  }
}

/** Shorthand for a JSON Schema object that the strict-tool path will accept. */
export function objectSchema(
  properties: Record<string, unknown>,
  required: string[],
): Record<string, unknown> {
  return { type: "object", properties, required, additionalProperties: false };
}

export const str = (description: string) => ({ type: "string", description });
export const num = (description: string) => ({ type: "number", description });
export const bool = (description: string) => ({ type: "boolean", description });
export const enumOf = (values: string[], description: string) => ({
  type: "string",
  enum: values,
  description,
});
export const arrayOf = (items: unknown, description: string) => ({
  type: "array",
  items,
  description,
});
