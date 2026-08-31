/**
 * Models sometimes emit a nested array/object tool-input field as a JSON
 * *string* instead of real JSON (seen live from both the planner and, more
 * often, the faster model powering the scouts). These helpers coerce that
 * back so a stringified array degrades to parsed data instead of a crash
 * or silently dropped fields.
 */

export function parseIfString(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/** Coerce a tool-input field to an array: real array passes through, a
 * stringified array gets parsed, and a double-wrap — the model stuffing
 * the whole payload into the field as a string, e.g.
 * {"recommendations": "{\"recommendations\": [...]}"} (seen live from the
 * fast model) — gets unwrapped one level. Anything else becomes []. */
export function coerceArray<T>(value: unknown): T[] {
  let parsed = parseIfString(value);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 1) {
      parsed = parseIfString(obj[keys[0]]);
    }
  }
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}
