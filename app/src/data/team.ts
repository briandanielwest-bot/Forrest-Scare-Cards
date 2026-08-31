import type { AvatarLook } from "../components/TeamAvatar";

/**
 * The Bayou & Blazer staff: one shared roster so the welcome screen, the
 * plan-building screen, and the agents all agree on who these people are.
 *
 * They are written as a real Houston shop's team, because that is what
 * they are meant to become. Each one learned the job somewhere specific in
 * this city, and each one does a real piece of the work on every plan. An
 * earlier roster named them after Houston sports legends, which was a fun
 * insider joke that made them mascots rather than staff, and it needed a
 * non-affiliation disclaimer besides.
 *
 * Portraits are original flat illustrations. They are not likenesses of
 * anyone real.
 */
export interface TeamMember {
  id: string;
  name: string;
  title: string;
  /** Where they learned this job, in this city. One or two sentences. */
  bio: string;
  /** The single concrete thing they do on every plan. */
  does: string;
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
    bio: "Fifteen years dressing Houston men, from summer interns to the corner office. She has seen every closet disaster this city produces, which is why nothing you say will faze her.",
    does: "Runs your interview and signs off on the finished plan.",
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
    bio: "Played offensive line until a knee gave out, then spent a decade fitting men who have never once fit a standard size. He can tell a sloped shoulder from a photo across a room.",
    does: "Reads your photos for the measurements off-the-rack always gets wrong.",
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
    bio: "Nine years running guest services at a Post Oak hotel, where she fielded the \"what do I wear tonight\" call so many times she started keeping a file on every venue in the city. She still keeps it.",
    does: "Knows what the room you are walking into actually wears.",
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
    bio: "Grew up in his parents' alterations shop on Bellaire Boulevard and could set a sleeve before he could drive. He knows which Houston benches do real work and which ones just shorten sleeves.",
    does: "Picks the tailor, and decides what you already own is worth saving.",
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
    bio: "Fifteen years on the Galleria floors, Neiman's and then Saks. She knows which labels get marked down in July and which never do, and she has never once been impressed by a logo.",
    does: "Works the designer floors for what is actually in stock in your size.",
    duty: "Walking the Galleria floors for what is in stock in your size, which is a different list from the lookbook.",
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
    bio: "Apprenticed at a resole bench before he ever sold a pair, so he judges a shoe by whether it can be rebuilt in ten years. He will talk you out of the cheap pair twice before he gives up.",
    does: "Picks shoes and boots that survive Houston and can be resoled.",
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
    bio: "Trained as an optician, then moved into buying frames, belts, and watches. She thinks most men spend their last two hundred dollars in exactly the wrong place, and she is usually right.",
    does: "Handles frames, belts, and the small things that finish a look.",
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
    bio: "A retail buyer for a decade before she got tired of selling men things in the wrong order. She builds the phased plan, and she is the reason the numbers add up.",
    does: "Turns everyone's picks into one phased plan your budget can actually carry.",
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
