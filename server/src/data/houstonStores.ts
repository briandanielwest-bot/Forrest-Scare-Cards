/**
 * Seed dataset of Houston-area custom & high-end menswear retailers.
 *
 * Researched via live web search (not just background knowledge) — every
 * `website` link below was found via an actual search result, not
 * recalled from memory. That research also caught and removed several
 * stores from an earlier version of this file that turned out to be
 * closed (Cutter Bill Western Wear, the Houston Stag Provisions location)
 * or not real businesses under the name previously used. Even so, this is
 * a seed list, not a live directory: `verified` stays false for every
 * row, addresses are neighborhood-level on purpose, and hours, current
 * operating status, and inventory should be confirmed on the store's own
 * site before a user relies on this to plan a visit — retail moves fast,
 * as the removals above prove. Swap `getAllStores()`'s source for a live
 * Places/Yelp API call to upgrade this without touching callers.
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
  website: string;
  verified: false;
}

export const HOUSTON_STORES: HoustonStore[] = [
  // ---- Bespoke & made-to-measure tailoring ----
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
    website: "https://www.tomjames.com/locations/houston",
    verified: false,
  },
  {
    id: "norton-ditto",
    name: "Norton Ditto",
    category: "bespoke-tailoring",
    neighborhood: "West Alabama St",
    priceTier: "$$$$",
    styleTags: ["classic", "business", "custom", "black-tie"],
    bestFor: "A genuinely old-Houston menswear institution — fine apparel, shoes, and custom clothing with complimentary in-house tailoring.",
    howToBuy: "Walk in or call for an appointment; in-house tailoring is included on purchases.",
    description:
      "Family-owned Houston menswear retailer dating to 1908 (originally Barringer-Norton). One of the city's longest-running sources for fine off-the-rack and custom clothing.",
    website: "https://nortonditto.com/",
    verified: false,
  },
  {
    id: "hamilton-shirts",
    name: "Hamilton Shirts",
    category: "bespoke-tailoring",
    neighborhood: "Richmond Ave",
    priceTier: "$$$",
    styleTags: ["custom", "classic", "business"],
    bestFor: "A dress shirt built from your own paper pattern — the single highest-leverage custom purchase for fit.",
    howToBuy: "Book a shirt-fitting appointment; they take custom measurements and hand-cut a paper pattern kept on file for reorders.",
    description:
      "Houston's oldest family-owned business (founded 1883), now run by the fourth generation. Makes ready-to-wear, made-to-measure, and fully bespoke shirts the traditional way — no laser cutters.",
    website: "https://hamiltonshirts.com/",
    verified: false,
  },
  {
    id: "q-clothier",
    name: "Q Clothier",
    category: "bespoke-tailoring",
    neighborhood: "Kirby Dr / Upper Kirby",
    priceTier: "$$$",
    styleTags: ["custom", "made-to-measure", "business", "modern"],
    bestFor: "Custom suits with a real turnaround — six weeks, not six months.",
    howToBuy: "Book a fitting appointment at the Kirby Dr location; choose cloth and details, then wait on made-to-measure production.",
    description:
      "Custom suit and shirt maker with over 60 years of combined tailoring experience behind it, known locally for a faster-than-average made-to-measure turnaround.",
    website: "https://qclothier.com/pages/houston",
    verified: false,
  },
  {
    id: "kuffs-houston",
    name: "Kuffs Houston",
    category: "bespoke-tailoring",
    neighborhood: "Heights-based, comes to you across Houston",
    priceTier: "$$$",
    styleTags: ["custom", "made-to-measure", "business", "black-tie"],
    bestFor: "Custom suits, shirts, and tuxedos without leaving your office — a mobile, appointment-based clothier.",
    howToBuy: "Schedule a fitting; the clothier travels to your home or office rather than running a storefront.",
    description:
      "Houston custom clothier with 20+ years of experience running a come-to-you model for suits, shirts, and tuxedos.",
    website: "https://www.kuffshouston.com/",
    verified: false,
  },
  {
    id: "lucho",
    name: "Lucho",
    category: "bespoke-tailoring",
    neighborhood: "Houston (by appointment)",
    priceTier: "$$$",
    styleTags: ["custom", "classic", "business"],
    bestFor: "A family-run custom tailoring shop with decades of continuous Houston operation behind it.",
    howToBuy: "Book a fitting appointment for measurements; expect multiple fittings as the garment is built.",
    description: "Family-run Houston custom tailor and luxury menswear shop operating continuously since 1989.",
    website: "https://lucho.com/",
    verified: false,
  },
  {
    id: "bill-walker-clothier",
    name: "Bill Walker Clothier",
    category: "bespoke-tailoring",
    neighborhood: "Houston (by appointment)",
    priceTier: "$$$",
    styleTags: ["made-to-measure", "business", "classic", "black-tie"],
    bestFor: "Made-to-measure suits, shirts, and tuxedos plus casual-luxury pieces from the same clothier.",
    howToBuy: "Schedule a fitting; ask about their tuxedo program if you need formalwear on the same visit.",
    description:
      "Houston made-to-measure clothier covering tailored suits, shirts, tuxedos, and casual luxury clothing including denim.",
    website: "https://billwalkerclothier.com/",
    verified: false,
  },
  {
    id: "festari-for-men",
    name: "Festari For Men",
    category: "bespoke-tailoring",
    neighborhood: "Post Oak Blvd / Galleria area",
    priceTier: "$$$$",
    styleTags: ["custom", "classic", "business", "black-tie"],
    bestFor: "A family-owned Post Oak institution doing both off-the-rack designer suiting and full custom/bespoke in one shop.",
    howToBuy: "Walk in or book a fitting; ask specifically about the bespoke program if you want a fully custom build rather than made-to-measure.",
    description:
      "Family-owned luxury menswear store on Post Oak Blvd since 1993, working in fabrics from Zegna, Loro Piana, and Scabal across off-the-rack, made-to-measure, and bespoke suits plus tuxedos.",
    website: "https://festariformen.com/",
    verified: false,
  },

  // ---- Luxury department & designer ----
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
      "Houston's most storied high-end menswear retailer, running since the early 1900s. Carries designer suits, sportswear, and dress furnishings, with a strong made-to-measure program.",
    website: "https://www.mpenner.com/",
    verified: false,
  },
  {
    id: "neiman-marcus-galleria",
    name: "Neiman Marcus",
    category: "luxury-department",
    neighborhood: "The Galleria",
    priceTier: "$$$$",
    styleTags: ["designer", "classic", "business", "black-tie"],
    bestFor: "Top-shelf designer suiting, outerwear, and accessories from the world's major fashion houses.",
    howToBuy: "Walk in, or ask for a personal shopper — free service that will pull looks to your budget and event ahead of a visit.",
    description:
      "Full-line Neiman Marcus flagship inside the Galleria complex, carrying men's designer clothing, shoes, and accessories from top international labels.",
    website: "https://www.neimanmarcus.com/stores/houston/tx/houston+-+galleria",
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
      "Full-line luxury department store with a strong men's designer offering inside the Galleria mall complex.",
    website: "https://www.saksfifthavenue.com/locations/houston/",
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
    website: "https://www.nordstrom.com/store-details/united-states/tx/houston/nordstrom-houston-galleria",
    verified: false,
  },
  {
    id: "zegna-houston",
    name: "Zegna",
    category: "luxury-department",
    neighborhood: "The Galleria / Uptown Park",
    priceTier: "$$$$",
    styleTags: ["designer", "classic", "business", "italian-tailoring"],
    bestFor: "Top-tier Italian suiting and outerwear from one of the true arbiters of modern menswear luxury.",
    howToBuy: "Walk in to either Houston boutique (Galleria or Uptown Park); ask about their made-to-measure program for a more built-for-you result.",
    description:
      "Italian fashion house boutique with two Houston locations, carrying luxury suiting, outerwear, and accessories from one of menswear's most respected names.",
    website: "https://www.zegna.com/us-en/store-locator/store-detail/united-states/houston/5015-westheimer-rd-ste-a3166.424/",
    verified: false,
  },
  {
    id: "brioni-river-oaks",
    name: "Brioni",
    category: "luxury-department",
    neighborhood: "River Oaks District",
    priceTier: "$$$$",
    styleTags: ["designer", "bespoke", "black-tie", "italian-tailoring"],
    bestFor: "About as high as ready-to-wear Italian tailoring goes, with bespoke service available in-store.",
    howToBuy: "Walk in to the River Oaks District boutique, or ask about their bespoke tailoring appointments.",
    description:
      "Storied Italian luxury house known for exquisite ready-to-wear and bespoke men's tailoring, with a boutique in the River Oaks District.",
    website: "https://www.brioni.com/",
    verified: false,
  },

  // ---- Contemporary & smart-casual boutiques ----
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
    website: "https://suitsupply.com/en-us/stores/houston",
    verified: false,
  },
  {
    id: "rye-51",
    name: "Rye 51",
    category: "contemporary-boutique",
    neighborhood: "Kirby Dr / Upper Kirby",
    priceTier: "$$$",
    styleTags: ["contemporary", "smart-casual", "denim", "designer"],
    bestFor: "The casual, off-duty counterpart to Q Clothier next door — contemporary designer denim and sportswear.",
    howToBuy: "Walk in; the shop sits beside Q Clothier's custom side for guys who want both in one stop.",
    description:
      "Contemporary menswear boutique carrying designer casualwear and denim (brands like Diesel and John Varvatos), sister shop to Q Clothier.",
    website: "https://rye51.com/pages/houston",
    verified: false,
  },
  {
    id: "manready-mercantile",
    name: "Manready Mercantile",
    category: "contemporary-boutique",
    neighborhood: "Houston Heights",
    priceTier: "$$$",
    styleTags: ["contemporary", "smart-casual", "workwear-inspired", "grooming"],
    bestFor: "Elevated casual and curated goods — the shop for a guy who wants quality basics and grooming without a dress code.",
    howToBuy: "Walk in; inventory mixes new pieces with vintage finds, so it rewards checking back in person.",
    description:
      "Heights neighborhood general-goods shop for men — clothing, shoes, accessories, grooming, and home goods, mixing new pieces with vintage finds from the owners' travels.",
    website: "https://manready.com/",
    verified: false,
  },

  // ---- Western wear, boots & leather ----
  {
    id: "lucchese",
    name: "Lucchese Bootmaker",
    category: "western-boots-leather",
    neighborhood: "Highland Village",
    priceTier: "$$$$",
    styleTags: ["western", "classic", "leather-goods"],
    bestFor: "Handcrafted boots built to become the one pair a guy wears for twenty years.",
    howToBuy: "Walk in for stock sizes and styles; ask about custom/bespoke boot programs for an exact fit and skin choice.",
    description:
      "Iconic American bootmaker founded in 1883, with a Houston boutique carrying exotic and classic leather boots plus belts and small leather goods.",
    website: "https://www.lucchese.com/",
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
      "The accessible end of Houston Western wear: boots and denim from Ariat, Justin, Lucchese, and more, without bespoke pricing. Multiple locations across greater Houston.",
    website: "https://www.cavenders.com/",
    verified: false,
  },
  {
    id: "pinto-ranch",
    name: "Pinto Ranch",
    category: "western-boots-leather",
    neighborhood: "Uptown / Post Oak Blvd",
    priceTier: "$$$$",
    styleTags: ["western", "classic", "leather-goods", "black-tie-western"],
    bestFor: "High-end Western wear a step above Cavender's — handmade boots and curated western fashion for rodeo season or a Texas-formal event.",
    howToBuy: "Walk in to the Post Oak Plaza location; custom hat shaping and exotic-skin boots may need a special order.",
    description:
      "Upscale Western apparel retailer known for handmade boots and a curated selection of high-end western wear, hats, and jewelry.",
    website: "https://pintoranch.com/",
    verified: false,
  },

  // ---- Footwear ----
  {
    id: "allen-edmonds-houston",
    name: "Allen Edmonds",
    category: "footwear",
    neighborhood: "Lamar / River Oaks area",
    priceTier: "$$$",
    styleTags: ["classic", "business", "leather-goods"],
    bestFor: "Recraftable American dress shoes — the pair that anchors a business wardrobe for a decade of resoling.",
    howToBuy: "Walk in for fitting; ask about the recrafting program before ever discarding a pair that's worn out.",
    description:
      "Classic American shoemaker's Houston storefront — oxfords, derbies, and loafers built to be resoled rather than replaced.",
    website: "https://www.allenedmonds.com/stores/tx/houston/77098/lamar-river-oaks-39116",
    verified: false,
  },

  // ---- Lifestyle & accessories ----
  {
    id: "kuhl-linscomb",
    name: "Kuhl-Linscomb",
    category: "lifestyle-accessories",
    neighborhood: "West Alabama St / Montrose",
    priceTier: "$$$",
    styleTags: ["grooming", "accessories", "gifts"],
    bestFor: "Finishing touches — grooming products, small leather goods, and gift-worthy accessories to round out a wardrobe.",
    howToBuy: "Walk in; this sprawling multi-building store is a browse-and-discover shop more than an appointment one.",
    description:
      "Upscale Houston lifestyle store spanning five buildings and 100,000+ square feet — best known for home goods and gifts, but a reliable source for men's grooming and small accessories.",
    website: "https://www.kuhl-linscomb.com/",
    verified: false,
  },
  {
    id: "zadok-jewelers",
    name: "Zadok Jewelers",
    category: "lifestyle-accessories",
    neighborhood: "Post Oak Blvd / Galleria area",
    priceTier: "$$$$",
    styleTags: ["watches", "jewelry", "finishing-touches"],
    bestFor: "A real watch, new or pre-owned — the accessory that finishes a high-end wardrobe.",
    howToBuy: "Walk in or book a private appointment; ask about pre-owned/certified options if buying new is out of budget.",
    description:
      "Houston luxury watch and jewelry retailer carrying brands like Cartier, Grand Seiko, Tudor, and Ulysse Nardin, including pre-owned Swiss watches.",
    website: "https://zadok.com/",
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
