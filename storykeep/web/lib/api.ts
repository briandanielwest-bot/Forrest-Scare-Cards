/**
 * The one place that talks to the API.
 *
 * `credentials: "include"` on every call is not optional: the session cookie
 * is cross-site (Vercel to Render), so a fetch without it is anonymous and
 * every page silently bounces to sign-in.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers:
      init.body instanceof FormData
        ? init.headers
        : { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

  const text = await response.text();
  const data = text ? safeJson(text) : null;

  if (!response.ok) {
    const message =
      (data as { error?: string } | null)?.error ??
      "Something went wrong. Your work is saved — try again in a moment.";
    throw new ApiError(message, response.status, data);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T,>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T,>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T,>(path: string) => request<T>(path, { method: "DELETE" }),
  form: <T,>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }),
  /** Downloads go through the browser so the file lands in the Downloads folder. */
  downloadUrl: (path: string) => `${API_BASE}${path}`,
};

export interface User {
  id: string;
  email: string;
  display_name: string | null;
}

export interface Book {
  id: string;
  genre: "memoir" | "kids" | "keepsake";
  title: string;
  subtitle: string | null;
  assist_level: "ghostwriter" | "cowriter" | "coach";
  status: string;
  target_pages: number | null;
  blueprint: { units?: number; trim?: string; shape?: string; brief?: string; audience?: string };
  updated_at: string;
  chapter_count?: string;
  written_count?: string;
  words?: string;
}

export interface Chapter {
  id: string;
  position: number;
  title: string;
  brief: string | null;
  status: string;
  current_draft_id: string | null;
  word_count: number | null;
  body: string | null;
}

export interface Spread {
  id: string;
  position: number;
  text: string;
  art_brief: string | null;
  image_url: string | null;
  image_status: string;
}

export interface Review {
  id: string;
  agent: string;
  severity: "note" | "warn" | "block";
  message: string;
  detail: { quote?: string; fix?: string } | null;
  chapter_id: string | null;
}

export interface Turn {
  id: string;
  role: "agent" | "author";
  text: string;
  source: "text" | "voice";
  created_at: string;
}
