import { Platform } from "react-native";
import type { HoustonStore, StoreCategory, StyleProfile, WardrobePlan } from "../types";

// Set EXPO_PUBLIC_API_BASE_URL in app/.env to point at your running server
// (see the root README). Falls back to localhost for the iOS simulator.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request to ${path} failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function startInterview() {
  return request<{ sessionId: string; reply: string; done: boolean; quickReplies?: string[] }>("/api/interview/start", {
    method: "POST",
  });
}

export function sendInterviewMessage(sessionId: string, message: string) {
  return request<{ reply: string; done: boolean; profile?: StyleProfile; quickReplies?: string[] }>("/api/interview/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
  });
}

export interface InterviewReply {
  reply: string;
  done: boolean;
  profile?: StyleProfile;
  quickReplies?: string[];
}

// Streaming turn: Kyla's words arrive as she writes them (web only — RN
// native fetch can't read response streams, so callers fall back to
// sendInterviewMessage there or on any failure).
export async function sendInterviewMessageStream(
  sessionId: string,
  message: string,
  onDelta: (fullTextSoFar: string) => void,
): Promise<InterviewReply> {
  const res = await fetch(`${API_BASE_URL}/api/interview/message/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`stream unavailable (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE frames are separated by a blank line; keep any partial frame.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const payload = JSON.parse(line.slice(6)) as { delta?: string; final?: InterviewReply; error?: string };
      if (payload.delta) {
        text += payload.delta;
        onDelta(text);
      } else if (payload.final) {
        return payload.final;
      } else if (payload.error) {
        throw new Error(payload.error);
      }
    }
  }
  throw new Error("stream ended without a final message");
}

export interface PickedPhoto {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  width?: number;
  height?: number;
}

export async function analyzePhotos(sessionId: string, photos: PickedPhoto[]) {
  const form = new FormData();
  form.append("sessionId", sessionId);

  if (Platform.OS === "web") {
    // A browser's real FormData needs an actual Blob/File — the
    // { uri, name, type } object below is a React Native-only convention
    // and silently produces no file part in a web build (confirmed: the
    // server received zero files even though a photo was selected).
    for (const [i, photo] of photos.entries()) {
      const blob = await fetch(photo.uri).then((r) => r.blob());
      form.append("photos", blob, photo.fileName ?? `photo-${i}.jpg`);
    }
  } else {
    photos.forEach((photo, i) => {
      // React Native's FormData accepts this { uri, name, type } shape directly.
      form.append("photos", {
        uri: photo.uri,
        name: photo.fileName ?? `photo-${i}.jpg`,
        type: photo.mimeType ?? "image/jpeg",
      } as unknown as Blob);
    });
  }

  // The server answers 202 immediately and analyzes in the background —
  // the plan pipeline picks up the assessment when it's ready.
  return request<{ status: string }>("/api/photo/analyze", {
    method: "POST",
    body: form,
  });
}

export type PlanStatus = "idle" | "generating" | "done" | "error";

// Plan generation runs five real Claude API calls end to end and can take
// over a minute — kicking it off returns immediately (202) so the request
// never has to stay open that long; poll getPlanStatus for the result.
export function startPlanGeneration(sessionId: string) {
  return request<{ status: PlanStatus }>("/api/plan/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
}

export function getPlanStatus(sessionId: string) {
  return request<{
    status: PlanStatus;
    stage?: "scouts" | "planner";
    draftedPhases?: string[];
    plan?: WardrobePlan;
    error?: string;
  }>(`/api/plan/${sessionId}`);
}

export function fetchStores() {
  return request<{ stores: HoustonStore[]; categoryLabels: Record<StoreCategory, string> }>("/api/stores");
}

// Claim-code memory: save the finished plan under a code; restore it later
// on any device (fresh session included, so Kyla's plan chat works again).
export function saveMemory(sessionId: string, purchasedKeys: string[], existingCode?: string) {
  return request<{ code: string }>("/api/memory/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, purchasedKeys, existingCode }),
  });
}

export function restoreMemory(code: string) {
  return request<{
    sessionId: string;
    profile?: StyleProfile;
    plan: WardrobePlan;
    purchasedKeys: string[];
    code: string;
  }>("/api/memory/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

export interface Outfit {
  name: string;
  occasion: string;
  pieces: string[];
}

// On-demand outfit matrix: "these 11 pieces make 14 outfits."
export function fetchOutfits(sessionId: string) {
  return request<{ outfits: Outfit[] }>("/api/plan/outfits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
}

// Post-plan Q&A with Kyla — she answers questions about the delivered plan
// ("can I swap the oxfords for loafers?") with the plan and profile in hand.
export function askKylaAboutPlan(sessionId: string, question: string, purchasedKeys: string[] = []) {
  return request<{ reply: string }>("/api/plan/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, question, purchasedKeys }),
  });
}

// One-off Houston style questions answered by the concierge's almanac. No
// session needed ("what do I wear to a Rodeo gala?").
export function askConcierge(question: string) {
  return request<{ reply: string }>("/api/almanac/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
}
