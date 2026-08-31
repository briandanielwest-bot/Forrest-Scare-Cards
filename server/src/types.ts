import type Anthropic from "@anthropic-ai/sdk";

export interface StyleProfile {
  firstName?: string;
  budgetTotalUsd: number;
  budgetCadence: "one-time" | "monthly" | "quarterly";
  lifestyle: string;
  /** Where in the Houston area he lives/works — routes the plan to nearby stores. */
  homeBase?: string;
  dressCodes: string[];
  styleArchetypes: string[];
  fitPreferences: string;
  colorPreferences: string[];
  colorsToAvoid: string[];
  brandAffinities: string[];
  occasionsToPlanFor: string[];
  timeline: string;
  sizes?: {
    jacket?: string;
    waist?: string;
    inseam?: string;
    shirtNeck?: string;
    shoe?: string;
  };
  notes: string;
}

export interface PhotoAssessment {
  numPhotosAnalyzed: number;
  currentStyleSummary: string;
  strengths: string[];
  gapsOrIssues: string[];
  skinUndertone: string;
  bestColors: string[];
  colorsToAvoidFromPhotos: string[];
  faceShape: string;
  faceGuidance: string[];
  bodyType: string;
  bodyProportionNotes: string;
  recommendedSilhouettes: string[];
  fitGuidance: string[];
}

export type StorePriority = "essential" | "recommended" | "nice-to-have";

export interface WardrobeItem {
  category: string;
  description: string;
  quantity: number;
  estimatedBudgetLowUsd: number;
  estimatedBudgetHighUsd: number;
  priority: StorePriority;
  recommendedStoreIds: string[];
  buyingNotes: string;
}

export interface WardrobePhase {
  name: string;
  timingLabel: string;
  goal: string;
  items: WardrobeItem[];
}

export interface WardrobePlan {
  guideTitle: string;
  introNarrative: string;
  climateNotes: string;
  phases: WardrobePhase[];
  budgetSummary: {
    totalBudgetUsd: number;
    perPhaseUsd: { phaseName: string; amountUsd: number }[];
  };
  generalBuyingTips: string[];
  finalPepTalk: string;
}

export type PlanStatus = "idle" | "generating" | "done" | "error";
export type PhotoStatus = "idle" | "analyzing" | "done" | "error";

export interface SessionState {
  id: string;
  createdAt: number;
  interviewHistory: Anthropic.MessageParam[];
  interviewComplete: boolean;
  styleProfile?: StyleProfile;
  photoAssessment?: PhotoAssessment;
  photoStatus: PhotoStatus;
  wardrobePlan?: WardrobePlan;
  planStatus: PlanStatus;
  planError?: string;
}

export interface UploadedImage {
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  base64Data: string;
}
