import { Platform } from "react-native";
import type { HoustonStore, PhotoAssessment, StoreCategory, StyleProfile, WardrobePlan } from "../types";

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
  return request<{ sessionId: string; reply: string; done: boolean }>("/api/interview/start", {
    method: "POST",
  });
}

export function sendInterviewMessage(sessionId: string, message: string) {
  return request<{ reply: string; done: boolean; profile?: StyleProfile }>("/api/interview/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
  });
}

export interface PickedPhoto {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
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

  return request<{ assessment: PhotoAssessment }>("/api/photo/analyze", {
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
  return request<{ status: PlanStatus; plan?: WardrobePlan; error?: string }>(`/api/plan/${sessionId}`);
}

export function fetchStores() {
  return request<{ stores: HoustonStore[]; categoryLabels: Record<StoreCategory, string> }>("/api/stores");
}
