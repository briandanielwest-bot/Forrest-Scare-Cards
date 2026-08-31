export interface StyleProfile {
  firstName?: string;
  budgetTotalUsd: number;
  budgetCadence: "one-time" | "monthly" | "quarterly";
  lifestyle: string;
  homeBase?: string;
  dressCodes: string[];
  styleArchetypes: string[];
  fitPreferences: string;
  colorPreferences: string[];
  colorsToAvoid: string[];
  brandAffinities: string[];
  occasionsToPlanFor: string[];
  timeline: string;
  northStar?: string;
  urgentEvent?: string;
  handleWithCare?: string;
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
  itemName?: string;
  sayThis?: string;
  keySpecs?: string[];
  tip?: string;
  decline?: string;
  whyThisStore?: string;
  logistics?: string;
  /** Legacy single-blob script from older stored plans. */
  buyingNotes?: string;
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

export type StoreCategory =
  | "bespoke-tailoring"
  | "luxury-department"
  | "western-boots-leather"
  | "contemporary-boutique"
  | "footwear"
  | "lifestyle-accessories"
  | "formal-wear"
  | "big-tall"
  | "alterations"
  | "eyewear";

export interface HoustonStore {
  id: string;
  name: string;
  category: StoreCategory;
  neighborhood: string;
  priceTier: "$$" | "$$$" | "$$$$";
  styleTags: string[];
  bestFor: string;
  howToBuy: string;
  description: string;
  website: string;
  contact?: string;
  knownFor?: string;
  catersTo?: string;
  seasonalNote?: string;
  lastVerified?: string;
  brands?: string[];
  pricePoints?: string[];
  insiderTake?: string;
  instagram?: string;
  facebook?: string;
}

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  /** Tappable answer options Kyla offered with this message. */
  quickReplies?: string[];
}
