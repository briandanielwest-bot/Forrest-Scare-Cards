import type { AvatarLook } from "../components/TeamAvatar";

/**
 * The Bayou & Blazer staff: one shared roster so the welcome screen, the
 * plan-building screen, and the agents all agree on who these people are.
 *
 * They are written as a real shop's team, because that is what they are
 * meant to become. Two labelled lines each, identical shape for all of
 * them: what they do for you, then the thing they love.
 *
 * The second line is the joke, and it only works because it is true both
 * ways. Counting, sorting, symmetry and a number that comes out even are
 * fixations anyone would recognize in a colleague, and they are also the
 * only things a machine would enjoy if a machine enjoyed anything. Nobody
 * has to be told it is a wink.
 *
 * No real streets or shops appear in a bio. Naming one implies a real
 * person worked there, and it reads as a claim about a business we do not
 * speak for. An earlier roster was named after Houston sports legends,
 * which made them mascots rather than staff and needed a non-affiliation
 * disclaimer besides.
 *
 * Portraits are original flat illustrations. They are not likenesses of
 * anyone real.
 */
export interface TeamMember {
  id: string;
  name: string;
  title: string;
  /** What they do for you. One line, no preamble. */
  does: string;
  /** The thing they love. One line, and the joke. */
  likes: string;
  /**
   * What they are doing right now while the plan builds. The wait is when
   * a man learns the work is real, so these name an actual step rather
   * than filling the time with a joke.
   */
  duty: string;
  stage: "warmup" | "scouts" | "planner";
  look: AvatarLook;
}

export const TEAM: TeamMember[] = [
  {
    id: "kyla",
    name: "Kyla",
    title: "Lead Stylist",
    does: "Runs your interview and gets the truth out of you inside ten minutes.",
    likes: "The moment a man stops describing the look he wants and admits what he hates.",
    duty: "Reading the team your file line by line, so nobody has to ask you the same question twice.",
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
    id: "theo",
    name: "Theo",
    title: "Fit & Build Specialist",
    does: "Reads shoulder slope and torso length off a photo, which is most of what a rack jacket gets wrong.",
    likes: "A fitting-room mirror mounted properly straight. He will level one himself.",
    duty: "Reading your photos for shoulder slope and torso length, the two things a rack jacket never accounts for.",
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
    id: "marisol",
    name: "Marisol",
    title: "Houston Concierge",
    does: "Knows what every room in this city wears, black tie down to Tuesday at the desk.",
    likes: "A venue that finally publishes its dress code in writing.",
    duty: "Checking what your calendar has coming and what those rooms actually wear this month.",
    stage: "warmup",
    look: {
      bg: "#E3D6D0",
      skin: "#C08A5E",
      hair: "#241A14",
      eye: "#2E1F16",
      jacket: "#5A3A2E",
      hairStyle: "long",
      accessory: "necklace",
      accent: "#D9B24C",
      lips: true,
    },
  },
  {
    id: "vinh",
    name: "Vinh",
    title: "Director of Tailoring",
    does: "Sees a jacket finished before the chalk comes out, and picks the tailor to do it.",
    likes: "Measuring three times. The first two agreeing is the best part.",
    duty: "Working out what in your closet a tailor can rescue before we spend a dollar on anything new.",
    stage: "scouts",
    look: {
      bg: "#DCE2D2",
      skin: "#E0B98E",
      hair: "#1E1610",
      eye: "#2E1F16",
      jacket: "#3C4C3A",
      hairStyle: "short",
      accessory: "tie",
      accent: "#7A2E2E",
    },
  },
  {
    id: "simone",
    name: "Simone",
    title: "Director of Designer Floors",
    does: "Knows which labels earn the price and which are charging for the name.",
    likes: "The markdown calendar. A full-price purchase in June is a personal failure.",
    duty: "Checking the designer floors for what is in stock in your size, which is a different list from the lookbook.",
    stage: "scouts",
    look: {
      bg: "#E0D8E4",
      skin: "#7A4A30",
      hair: "#1E1610",
      eye: "#2E1F16",
      jacket: "#2A2A33",
      hairStyle: "long",
      accessory: "necklace",
      accent: "#C9A227",
      lips: true,
    },
  },
  {
    id: "ade",
    name: "Ade",
    title: "Director of Footwear",
    does: "Judges every shoe by whether it can still be rebuilt in ten years.",
    likes: "Cost per wear. He can recite it for all four pairs he owns.",
    duty: "Sorting which shoes on your list can be resoled for a decade and which are disposable.",
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
    id: "priya",
    name: "Priya",
    title: "Director of Accessories",
    does: "Matches frames to your face faster than anyone here, and buys the belts and watches too.",
    likes: "A display case ordered by frame width. Do not put one back wrong.",
    duty: "Matching frames to your face and a belt to the shoes we just picked, in that order.",
    stage: "scouts",
    look: {
      bg: "#E6DCCB",
      skin: "#B07A4E",
      hair: "#2E241C",
      eye: "#3A2C1E",
      jacket: "#503A4A",
      hairStyle: "long",
      accessory: "necklace",
      accent: "#2E4A6E",
      lips: true,
    },
  },
  {
    id: "elena",
    name: "Elena",
    title: "Head of Wardrobe Planning",
    does: "Turns everyone's picks into one plan with the money and the order worked out.",
    likes: "When the last item lands on the last dollar exactly. She keeps a note of every time.",
    duty: "Laying all of it against your budget and Houston's calendar, in the order you should buy it.",
    stage: "planner",
    look: {
      bg: "#DFD9CE",
      skin: "#D9AE86",
      hair: "#201812",
      eye: "#2E1F16",
      jacket: "#1F2E3E",
      hairStyle: "long",
      accessory: "necklace",
      accent: "#B08A3E",
      lips: true,
    },
  },
];
