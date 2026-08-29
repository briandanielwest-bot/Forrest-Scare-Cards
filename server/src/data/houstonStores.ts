/**
 * Seed dataset of Houston-area custom & high-end menswear retailers.
 *
 * This is curated from general/background knowledge, NOT a live, verified
 * business directory — addresses are given at neighborhood/shopping-center
 * granularity on purpose, `verified` is false for every row, and hours,
 * exact addresses, phone numbers, and even whether a shop is still open
 * should be confirmed (Google/Yelp/the store's own site) before a user
 * relies on this to plan a visit. Swap `getAllStores()`'s source for a
 * live Places/Yelp API call to upgrade this without touching callers.
 */

export type StoreCategory =
  | "bespoke-tailoring"
  | "luxury-department"
  | "western-boots-leather"
  | "contemporary-boutique"
  | "footwear"
  | "lifestyle-accessories";

export type PriceTier = "$$" | "$$$" | "$$$$";

export interface HoustonStore {
  id: string;
  name: string;
  category: StoreCategory;
  neighborhood: string;
  priceTier: PriceTier;
  styleTags: string[];
  bestFor: string;
  howToBuy: string;
  description: string;
  verified: false;
}

export const HOUSTON_STORES: HoustonStore[] = [
  {
    id: "m-penner",
    name: "M Penner",
    category: "luxury-department",
    neighborhood: "River Oaks",
    priceTier: "$$$$",
    styleTags: ["classic", "business", "black-tie", "designer"],
    bestFor: "The one-stop institution — designer ready-to-wear plus in-house custom suiting under one roof.",
    howToBuy: "Walk in or book a fitting appointment with a stylist; expect knowledgeable staff who will measure you for both off-the-rack and custom pieces.",
    description:
      "Houston's most storied high-end menswear retailer, running since the early 1900s. Carries designer suits, sportswear, and dress furnishings, with a strong made-to-measure program for guys who want a Houston-tailored fit without a fully bespoke build.",
    verified: false,
  },
  {
    id: "anthony-marino",
    name: "Anthony Marino Custom Clothier",
    category: "bespoke-tailoring",
    neighborhood: "Uptown / River Oaks area",
    priceTier: "$$$$",
    styleTags: ["bespoke", "classic", "business", "black-tie"],
    bestFor: "A true bespoke suit or shirt built from your measurements up — the top of the formality ladder.",
    howToBuy: "Book a consultation appointment; expect multiple fittings over several weeks as the garment is built.",
    description:
      "A Houston bespoke house building fully custom suits and shirts to individual pattern, aimed at guys who want a suit that fits nowhere else because it was never anywhere else.",
    verified: false,
  },
  {
    id: "oliver-kessler",
    name: "Oliver Kessler Custom Clothiers",
    category: "bespoke-tailoring",
    neighborhood: "Houston (by appointment)",
    priceTier: "$$$$",
    styleTags: ["made-to-measure", "business", "classic"],
    bestFor: "Made-to-measure suiting for guys building a rotation of work suits without full bespoke pricing.",
    howToBuy: "Schedule a fitting; choose cloth and details, then wait on a made-to-measure turnaround (typically weeks).",
    description:
      "Custom clothier specializing in made-to-measure suits and shirts — a step down in price and wait time from full bespoke, a step up in fit from anything off a rack.",
    verified: false,
  },
  {
    id: "tom-james",
    name: "Tom James Company (Houston)",
    category: "bespoke-tailoring",
    neighborhood: "In-office / in-home fittings across Houston",
    priceTier: "$$$",
    styleTags: ["made-to-measure", "business", "classic"],
    bestFor: "Guys who want custom clothing without ever driving to a shop — the clothier comes to you.",
    howToBuy: "Contact a local Tom James clothier to schedule a measuring session at your office or home; reorders are easy once your pattern is on file.",
    description:
      "National made-to-measure clothier with Houston-based representatives who build a personal fit file, then bring fabric books and fittings to your calendar instead of the other way around.",
    verified: false,
  },
  {
    id: "suitsupply-river-oaks-district",
    name: "Suitsupply",
    category: "contemporary-boutique",
    neighborhood: "River Oaks District",
    priceTier: "$$$",
    styleTags: ["modern", "business", "smart-casual", "made-to-measure"],
    bestFor: "Modern, slimmer-cut suiting at a real price with same-day options and a made-to-measure upgrade path.",
    howToBuy: "Walk in — in-store tailors do fit adjustments same-visit; ask about the made-to-measure program for a more built-for-you result.",
    description:
      "European-owned suiting shop with a sharper, more fashion-forward cut than the traditional Houston houses. Good middle rung between department-store suits and full custom.",
    verified: false,
  },
  {
    id: "neiman-marcus-mens",
    name: "Neiman Marcus Men's Store",
    category: "luxury-department",
    neighborhood: "The Galleria",
    priceTier: "$$$$",
    styleTags: ["designer", "classic", "business", "black-tie"],
    bestFor: "Top-shelf designer suiting, outerwear, and accessories in one dedicated men's building.",
    howToBuy: "Walk in, or ask for a personal shopper — free service that will pull looks to your budget and event ahead of a visit.",
    description:
      "A standalone men's building next to the main Galleria store — one of very few free-standing Neiman Marcus men's shops anywhere, stocked with major designer labels top to bottom.",
    verified: false,
  },
  {
    id: "saks-galleria",
    name: "Saks Fifth Avenue",
    category: "luxury-department",
    neighborhood: "The Galleria",
    priceTier: "$$$$",
    styleTags: ["designer", "business", "smart-casual"],
    bestFor: "Broad designer menswear selection with strong seasonal sale cycles.",
    howToBuy: "Walk in; check the men's designer floor's sale section for steep off-season markdowns on the same labels.",
    description:
      "Full-line luxury department store with a solid men's designer offering inside the Galleria mall complex.",
    verified: false,
  },
  {
    id: "nordstrom-galleria",
    name: "Nordstrom",
    category: "luxury-department",
    neighborhood: "The Galleria",
    priceTier: "$$$",
    styleTags: ["contemporary", "business-casual", "smart-casual", "designer"],
    bestFor: "The best range from wear-to-work basics up to designer, with an easy return policy for a guy still dialing in his fit.",
    howToBuy: "Walk in; the men's shoe and suiting departments both offer in-house tailoring for hemming and adjustments.",
    description:
      "The most forgiving on-ramp of the Galleria luxury stores — contemporary and designer menswear side by side, with alterations included on many purchases.",
    verified: false,
  },
  {
    id: "cutter-bill",
    name: "Cutter Bill Western Wear",
    category: "western-boots-leather",
    neighborhood: "Uptown / near River Oaks",
    priceTier: "$$$$",
    styleTags: ["western", "black-tie-western", "classic"],
    bestFor: "High-end Western wear for rodeo season, ranch events, or any Houston occasion that calls for boots with a suit.",
    howToBuy: "Walk in for boots and hats; custom hat shaping and exotic-skin boots may need a special order.",
    description:
      "The long-standing choice for Houston's energy-and-ranching set when the dress code is 'Texas formal' — quality Stetsons, belts, and boots up to exotic leathers.",
    verified: false,
  },
  {
    id: "lucchese",
    name: "Lucchese Bootmaker",
    category: "western-boots-leather",
    neighborhood: "River Oaks District",
    priceTier: "$$$$",
    styleTags: ["western", "classic", "leather-goods"],
    bestFor: "Handcrafted boots built to become the one pair a guy wears for twenty years.",
    howToBuy: "Walk in for stock sizes and styles; ask about custom/bespoke boot programs for an exact fit and skin choice.",
    description:
      "Iconic American bootmaker's Houston boutique — exotic and classic leather boots plus belts and small leather goods, all built to be resoled and rebuilt for decades.",
    verified: false,
  },
  {
    id: "cavenders",
    name: "Cavender's Boot City",
    category: "western-boots-leather",
    neighborhood: "Multiple Houston-area locations",
    priceTier: "$$",
    styleTags: ["western", "casual", "workwear"],
    bestFor: "Quality Western basics — jeans, boots, and hats — at a real-world price point.",
    howToBuy: "Walk in; wide size runs make this the easiest Western store for an off-the-rack fit.",
    description:
      "The accessible end of Houston Western wear: dependable boots and denim without bespoke pricing, good for building out casual rotation pieces.",
    verified: false,
  },
  {
    id: "stag-provisions",
    name: "Stag Provisions for Men",
    category: "contemporary-boutique",
    neighborhood: "Houston Heights",
    priceTier: "$$$",
    styleTags: ["contemporary", "smart-casual", "denim", "workwear-inspired"],
    bestFor: "Elevated casual — the jeans, boots, and jackets a guy wears when there's no dress code but he still wants to look put-together.",
    howToBuy: "Walk in; small-batch and heritage-brand stock turns over fast, so it rewards checking back in person.",
    description:
      "A Heights neighborhood menswear boutique built around quality casualwear: raw denim, boots, outerwear, and grooming — the anti-department-store shop for off-duty Houston style.",
    verified: false,
  },
  {
    id: "kuhl-linscomb",
    name: "Kuhl-Linscomb",
    category: "lifestyle-accessories",
    neighborhood: "Dunlavy St / Montrose",
    priceTier: "$$$",
    styleTags: ["grooming", "accessories", "gifts"],
    bestFor: "Finishing touches — grooming products, small leather goods, and gift-worthy accessories to round out a wardrobe.",
    howToBuy: "Walk in; this is a browse-and-discover shop more than an appointment one.",
    description:
      "Upscale Houston lifestyle store best known for home goods, but a reliable source for grooming and small accessories that complete a look rather than anchor it.",
    verified: false,
  },
  {
    id: "allen-edmonds-galleria",
    name: "Allen Edmonds",
    category: "footwear",
    neighborhood: "The Galleria area",
    priceTier: "$$$",
    styleTags: ["classic", "business", "leather-goods"],
    bestFor: "Recraftable American dress shoes — the pair that anchors a business wardrobe for a decade of resoling.",
    howToBuy: "Walk in for fitting; ask about the recrafting program before ever discarding a pair that's worn out.",
    description:
      "Classic American shoemaker's Houston storefront — oxfords, derbies, and loafers built to be resoled rather than replaced.",
    verified: false,
  },
];

export function getAllStores(): HoustonStore[] {
  return HOUSTON_STORES;
}

export function getStoresByCategory(category: StoreCategory): HoustonStore[] {
  return HOUSTON_STORES.filter((s) => s.category === category);
}

export const STORE_CATEGORY_LABELS: Record<StoreCategory, string> = {
  "bespoke-tailoring": "Bespoke & Made-to-Measure Tailors",
  "luxury-department": "Luxury Department & Multi-Brand",
  "western-boots-leather": "Western Wear & Boots",
  "contemporary-boutique": "Contemporary & Smart-Casual Boutiques",
  footwear: "Footwear",
  "lifestyle-accessories": "Lifestyle & Accessories",
};
