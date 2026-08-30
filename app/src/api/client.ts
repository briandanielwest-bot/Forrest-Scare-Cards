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
  photos.forEach((photo, i) => {
    // React Native's FormData accepts this { uri, name, type } shape directly.
    form.append("photos", {
      uri: photo.uri,
      name: photo.fileName ?? `photo-${i}.jpg`,
      type: photo.mimeType ?? "image/jpeg",
    } as unknown as Blob);
  });

  return request<{ assessment: PhotoAssessment }>("/api/photo/analyze", {
    method: "POST",
    body: form,
  });
}

export function generatePlan(sessionId: string) {
  return request<{ plan: WardrobePlan }>("/api/plan/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
}

export function fetchStores() {
  return request<{ stores: HoustonStore[]; categoryLabels: Record<StoreCategory, string> }>("/api/stores");
}
