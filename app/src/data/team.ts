import type { AvatarLook } from "../components/TeamAvatar";

/**
 * The Bayou & Blazer staff — one shared roster so the Welcome screen and
 * the plan-building screen always agree on names, titles, and faces.
 *
 * Names (other than Kyla) are a fan homage to Houston sports legends,
 * matched to each role — not affiliated with or endorsed by the people
 * they honor. Their portraits are original flat illustrations, not
 * likenesses of anyone real.
 */
export interface TeamMember {
  id: string;
  name: string;
  title: string;
  // What they're doing while the plan is being built — written to show the
  // real work (and the app's value) during the wait, not to fill space.
  duty: string;
  stage: "warmup" | "scouts" | "planner";
  look: AvatarLook;
}

export const TEAM: TeamMember[] = [
  {
    id: "kyla",
    name: "Kyla",
    title: "Lead Stylist",
    duty: "Briefing the whole team on your profile — every answer you gave her is shaping what gets picked.",
    stage: "warmup",
    look: {
      bg: "#EFE0D2",
      skin: "#EFCBA8",
      hair: "#3E2617",
      eye: "#6B4226",
      jacket: "#1F3A34",
      hairStyle: "long",
      accessory: "necklace",
      accent: "#E4C05C",
      lips: true,
    },
  },
  {
    id: "watt",
    name: "Watt",
    title: "Fit & Build Specialist",
    duty: "Reading your photos like Thursday-night film — collar, lapel, and frame calls tuned to your build.",
    stage: "warmup",
    look: {
      bg: "#D8E0DC",
      skin: "#EBC49E",
      hair: "#4E3A28",
      eye: "#4A6E9C",
      jacket: "#2E3B4E",
      hairStyle: "short",
      beard: true,
    },
  },
  {
    id: "campbell",
    name: "Campbell",
    title: "Houston Concierge",
    duty: "Checking the city's calendar and climate so nothing you buy fights August — or misses gala season.",
    stage: "warmup",
    look: {
      bg: "#E3D6D0",
      skin: "#8C5A3C",
      hair: "#241A14",
      eye: "#2E1F16",
      jacket: "#5A3A2E",
      hairStyle: "short",
      accessory: "pocketSquare",
      accent: "#D9B24C",
    },
  },
  {
    id: "biggio",
    name: "Biggio",
    title: "Director of Tailoring",
    duty: "Working Houston's custom shops and alteration benches — every piece in your plan gets a fit path.",
    stage: "scouts",
    look: {
      bg: "#DCE2D2",
      skin: "#EBC9A4",
      hair: "#5A4632",
      eye: "#4E6E8E",
      jacket: "#3C4C3A",
      hairStyle: "short",
      accessory: "tie",
      accent: "#7A2E2E",
    },
  },
  {
    id: "drexler",
    name: "Drexler",
    title: "Director of Designer Floors",
    duty: "Gliding through the Galleria and River Oaks designer floors so you only walk the racks that matter.",
    stage: "scouts",
    look: {
      bg: "#E0D8E4",
      skin: "#7A4A30",
      hair: "#1E1610",
      eye: "#2E1F16",
      jacket: "#2A2A33",
      hairStyle: "buzz",
      accessory: "pocketSquare",
      accent: "#C9A227",
    },
  },
  {
    id: "olajuwon",
    name: "Olajuwon",
    title: "Director of Footwear",
    duty: "Matching every shoe to decade math, not season math — recraftable soles, Houston-rain-proof picks.",
    stage: "scouts",
    look: {
      bg: "#D9DEE6",
      skin: "#6E4226",
      hair: "#161010",
      eye: "#241A12",
      jacket: "#4A3226",
      hairStyle: "buzz",
    },
  },
  {
    id: "wagner",
    name: "Wagner",
    title: "Director of Accessories",
    duty: "Closing with the details people actually notice — the belt, the frames, the watch, the finish.",
    stage: "scouts",
    look: {
      bg: "#E6DCCB",
      skin: "#E6BC96",
      hair: "#2E241C",
      eye: "#3A5C7A",
      jacket: "#503A4A",
      hairStyle: "short",
      accessory: "tie",
      accent: "#2E4A6E",
      beard: true,
    },
  },
  {
    id: "moon",
    name: "Moon",
    title: "Head of Wardrobe Planning",
    duty: "Cross-checking 40+ vetted stores, your budget, and your timeline into one buyable, phase-by-phase plan.",
    stage: "planner",
    look: {
      bg: "#DFD9CE",
      skin: "#8C5A3C",
      hair: "#201812",
      eye: "#2E1F16",
      jacket: "#1F2E3E",
      hairStyle: "short",
      accessory: "tie",
      accent: "#B08A3E",
      beard: true,
    },
  },
];
