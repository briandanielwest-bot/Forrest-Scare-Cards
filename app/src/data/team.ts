import type { AvatarLook } from "../components/TeamAvatar";

/**
 * The Bayou & Blazer staff: one shared roster so the welcome screen, the
 * plan-building screen, and the agents all agree on who these people are.
 *
 * They are written as a real shop's team, because that is what they are
 * meant to become. Two sentences each: what they are good at, then one
 * human thing that is true of a person and not of a job description.
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
    bio: "Fifteen years of dressing men has made her quick at it. She can tell inside one conversation what a man will actually wear and what will hang in his closet with the tag still on.",
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
    bio: "He reads shoulder slope, torso length and posture off a photo, which covers most of what a jacket off the rack gets wrong. He was a big kid who never found one that fit, and he has not entirely gotten over it.",
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
    bio: "She knows what every kind of room in this city actually wears, from a black-tie table to a client dinner to a Tuesday at the office. She keeps a file on it and updates it whenever she hears a dress code has drifted, which is more often than people expect.",
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
    bio: "He learned tailoring from his parents and can see what a jacket will look like altered before the chalk comes out. He is the one who tells you your favorite blazer is past saving, kindly, and he is usually right.",
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
    bio: "Fifteen years selling designer menswear taught her which labels earn the money and which are charging for the name. She has never been impressed by a logo and she will not pretend otherwise to move a jacket.",
    does: "Works the designer floors for what is actually in stock in your size.",
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
    bio: "He repaired shoes before he ever sold a pair, so he judges every one by whether it can be rebuilt in ten years. He owns four pairs and has resoled two of them twice.",
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
    bio: "Trained as an optician, she matches frames to a face better than anyone here, and she buys the belts and watches too. She thinks most men spend their last two hundred dollars in the wrong place, and she will say so before you do it.",
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
    bio: "She turns everyone else's picks into one plan with the money and the order worked out. She checks the arithmetic twice because she was four hundred dollars off once, years ago, and has never quite let it go.",
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
