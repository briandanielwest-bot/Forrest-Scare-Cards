/**
 * Seed dataset of Houston-area custom & high-end menswear retailers.
 *
 * Researched via live web search (not just background knowledge) — every
 * `website` link below was found via an actual search result, not
 * recalled from memory. That research also caught and removed several
 * stores from an earlier version of this file that turned out to be
 * closed (Cutter Bill Western Wear, the Houston Stag Provisions location)
 * or not real businesses under the name previously used. Operating status
 * is no longer a hand-maintained flag: the monthly refresh writes
 * storeFreshness.ts from live search, getAllStores drops anything found
 * closed, and each surviving row carries the date it was last checked.
 * Addresses stay neighborhood-level on purpose, and hours and inventory
 * should still be confirmed with the store before a user drives across
 * town, because retail moves fast, as the removals above prove. Swap `getAllStores()`'s source for a live
 * Places/Yelp API call to upgrade this without touching callers.
 */

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
  /** Phone or booking contact, when found via live search. */
  contact?: string;
  /** Signature items / what the store is genuinely known for. */
  knownFor: string;
  /** Who actually shops there — the store's real clientele. */
  catersTo: string;
  /** From the monthly refresh: one current, shopper-useful note. */
  seasonalNote?: string;
  /** From the monthly refresh: date this store was last re-verified. */
  lastVerified?: string;
  /** From deep research: brands/labels this store actually carries. */
  brands?: string[];
  /** From deep research: real price points, "<item>: <price>". */
  pricePoints?: string[];
  /** From deep research: the insider detail worth knowing before you walk in. */
  insiderTake?: string;
  /** Official Instagram handle (no @) — the store's own public profile. */
  instagram?: string;
  /** Official Facebook page URL. */
  facebook?: string;
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
    bestFor: "Guys who want custom clothing without ever driving to a shop. The clothier comes to you.",
    howToBuy: "Contact a local Tom James clothier to schedule a measuring session at your office or home; reorders are easy once your pattern is on file.",
    description:
      "National made-to-measure clothier with Houston-based representatives who build a personal fit file, then bring fabric books and fittings to your calendar instead of the other way around.",
    website: "https://www.tomjames.com/locations/houston",
    knownFor: "A personal fit file plus fabric books brought to your office, suits, shirts, and reorders without a store visit.",
    catersTo: "Busy professionals and executives who would rather never set foot in a shop.",
  },
  {
    id: "norton-ditto",
    name: "Norton Ditto",
    category: "bespoke-tailoring",
    neighborhood: "West Alabama St",
    priceTier: "$$$$",
    styleTags: ["classic", "business", "custom", "black-tie"],
    bestFor: "A genuinely old-Houston menswear institution: fine apparel, shoes, and custom clothing with complimentary in-house tailoring.",
    howToBuy: "Walk in or call for an appointment; in-house tailoring is included on purchases.",
    description:
      "Family-owned Houston menswear retailer dating to 1908 (originally Barringer-Norton). One of the city's longest-running sources for fine off-the-rack and custom clothing.",
    website: "https://nortonditto.com/",
    contact: "(713) 688-9800",
    knownFor: "Old-Houston tailored clothing, fine suits, sport coats, and trousers with complimentary in-house tailoring, since 1908.",
    catersTo: "Established professionals who want a traditional, relationship-driven menswear house.",
  },
  {
    id: "hamilton-shirts",
    name: "Hamilton Shirts",
    category: "bespoke-tailoring",
    neighborhood: "Richmond Ave",
    priceTier: "$$$",
    styleTags: ["custom", "classic", "business"],
    bestFor: "A dress shirt built from your own paper pattern, the single highest-leverage custom purchase for fit.",
    howToBuy: "Book a shirt-fitting appointment; they take custom measurements and hand-cut a paper pattern kept on file for reorders.",
    description:
      "Houston's oldest family-owned business (founded 1883), now run by the fourth generation. Makes ready-to-wear, made-to-measure, and fully bespoke shirts the traditional way, no laser cutters.",
    website: "https://hamiltonshirts.com/",
    contact: "(713) 264-8800, call to book a shirt fitting",
    knownFor: "Dress shirts cut from a hand-drawn paper pattern kept on file, ready-to-wear through fully bespoke, made in Houston since 1883.",
    catersTo: "Men who've learned off-the-rack shirts never quite fit, from a first custom shirt to lifelong reorders.",
  },
  // Seven independents added 2026-09-01 from scripts/verify-candidates.ts.
  // Each was found by the discovery pass, then independently confirmed as
  // currently trading with a real street address before being listed. The
  // same run rejected a store that turned out to be in Dallas, one that
  // does not appear to exist in Houston, and a mobile clothier whose only
  // address is a private residence.
  {
    id: "nick-lopez-tailoring",
    name: "Nick Lopez Tailoring",
    category: "bespoke-tailoring",
    neighborhood: "Sage Rd / Galleria",
    priceTier: "$$$",
    styleTags: ["bespoke", "custom", "business", "classic"],
    bestFor: "Full-canvas bespoke cut and hand-stitched on site, not sent out to a factory.",
    howToBuy: "Book a fitting by phone; walk-ins are taken for alterations during posted hours.",
    description:
      "Third-generation tailor working in Houston since 1981, making 100% hand-stitched full-canvas suits on the premises. A two-piece bespoke suit runs around $1,700.",
    website: "https://nicklopeztailoring.com/",
    contact: "(713) 621-5411, call to book a fitting",
    knownFor: "Full-canvas bespoke suits, hand-stitched on site by a third-generation tailor.",
    catersTo: "Professionals and executives who want a real bespoke suit for business, court, or a formal occasion.",
  },
  {
    id: "ahmeds-custom-clothiers",
    name: "Ahmed's Custom Clothiers",
    category: "bespoke-tailoring",
    neighborhood: "Chimney Rock / Galleria",
    priceTier: "$$$$",
    styleTags: ["bespoke", "custom", "business", "classic"],
    bestFor: "Made-to-order suits cut on the premises by the man whose name is on the door.",
    howToBuy: "By appointment, with every fitting taken by Jimmy Ahmed himself. Home and office appointments available by phone.",
    description:
      "A Houston custom tailoring shop of more than forty years, making suits, shirts and alterations on premises rather than sending work out.",
    website: "https://ahmedscustomclothiers.com/",
    contact: "(713) 977-3401, call to book with the tailor",
    knownFor: "Made-to-order suits and shirts crafted on premises by master tailor Jimmy Ahmed.",
    catersTo: "Executives, attorneys, judges and physicians who want one tailor who knows their file.",
  },
  {
    id: "saads-tailors",
    name: "Saad's Tailors",
    category: "bespoke-tailoring",
    neighborhood: "Westheimer / Galleria",
    priceTier: "$$",
    styleTags: ["custom", "made-to-measure", "business", "classic"],
    bestFor: "Custom Italian suiting at a price well under the Galleria's designer floors.",
    howToBuy: "Walk in Monday to Saturday, or book a consultation. Mobile fittings at home or the office are available.",
    description:
      "A family-owned tailoring boutique in the Galleria area since 1971, making custom suits from European cloth and doing expert alterations.",
    website: "https://saadtailors.com/",
    contact: "(713) 785-2212, call to schedule",
    knownFor: "Custom Italian suits and European fabrics from a family shop running since 1971.",
    catersTo: "Professionals, grooms and wedding parties who want a precise fit without a four-figure bill.",
  },
  {
    id: "larrys-original-custom-tailors",
    name: "Larry's Original Custom Tailors",
    category: "bespoke-tailoring",
    neighborhood: "Hillcroft / Westpark",
    priceTier: "$$",
    styleTags: ["custom", "business", "classic", "value"],
    bestFor: "A made-from-scratch custom suit at a price most men assume buys off the rack.",
    howToBuy: "Call ahead to book; estimates are free. Posted hours are Monday to Friday and Saturday morning.",
    description:
      "Family-owned since 1975, cutting men's suits, shirts and slacks from scratch using 25+ measurements and a library of more than 3,000 fabrics. Custom suits advertised from about $499.",
    website: "https://www.myhoustontailor.com/custom-mens-clothing",
    contact: "(832) 755-9740, call to book a fitting",
    knownFor: "Made-from-scratch custom suits from around $499, cut on 25+ measurements.",
    catersTo: "Men who don't fit a standard rack size and want custom without a luxury budget.",
  },
  {
    id: "knot-standard-houston",
    name: "Knot Standard",
    category: "bespoke-tailoring",
    neighborhood: "Westheimer / River Oaks District",
    priceTier: "$$$",
    styleTags: ["made-to-measure", "custom", "modern", "business"],
    bestFor: "Made-to-measure with a stylist walking you through it, in a showroom rather than a shop floor.",
    howToBuy: "Book a showroom fitting online; virtual appointments are also offered.",
    description:
      "Showroom-based made-to-measure suits, shirts and accessories, sold through a stylist-led fitting rather than a rack.",
    website: "https://www.knotstandard.com/showrooms/houston/",
    contact: "(713) 352-7316, book a showroom fitting",
    knownFor: "Stylist-led made-to-measure fittings in a private showroom.",
    catersTo: "Professionals and wedding parties who want guidance through the process, not just measurements.",
  },
  {
    id: "memorial-tailors",
    name: "Memorial Tailors",
    category: "alterations",
    neighborhood: "Katy Fwy / Memorial",
    priceTier: "$$",
    styleTags: ["alterations", "classic"],
    bestFor: "Alterations good enough that professional sports teams send their uniforms here.",
    howToBuy: "Walk in or book an appointment.",
    description:
      "An award-winning Houston alterations shop that also makes custom uniforms for professional sports and dance teams.",
    website: "https://memorialtailors.com/",
    contact: "(713) 461-2230, call for alteration timing",
    knownFor: "Award-winning alterations, plus custom uniform work for professional teams.",
    catersTo: "Anyone needing a suit taken in properly, and wedding parties needing gown and formalwear work.",
  },
  {
    id: "star-tailor-alterations",
    name: "Star Tailor & Alterations",
    category: "alterations",
    neighborhood: "Westheimer / Montrose",
    priceTier: "$$",
    styleTags: ["alterations", "repair"],
    bestFor: "Re-weaving and leather repair, which almost no alterations shop still does.",
    howToBuy: "Walk in during posted hours.",
    description:
      "A long-running Montrose shop doing suit and trouser alterations alongside re-weaving, leather repair and dry cleaning.",
    website: "https://startailor.net/",
    contact: "(713) 524-7904, walk in or call",
    knownFor: "Alterations plus re-weaving and leather repair, a combination almost nobody else offers.",
    catersTo: "Men fixing what they already own, including the jacket a moth found.",
  },
  {
    id: "q-clothier",
    name: "Q Clothier",
    category: "bespoke-tailoring",
    neighborhood: "Kirby Dr / Upper Kirby",
    priceTier: "$$$",
    styleTags: ["custom", "made-to-measure", "business", "modern"],
    bestFor: "Custom suits with a real turnaround: six weeks instead of six months.",
    howToBuy: "Book a fitting appointment at the Kirby Dr location; choose cloth and details, then wait on made-to-measure production.",
    description:
      "Custom suit and shirt maker with over 60 years of combined tailoring experience behind it, known locally for a faster-than-average made-to-measure turnaround.",
    website: "https://qclothier.com/pages/houston",
    contact: "(713) 523-8333, call to schedule a fitting",
    knownFor: "Made-to-measure suits and shirts with one of the faster turnarounds in town and a personal-stylist experience.",
    catersTo: "Professionals who want custom without the long wait, from first suit to full wardrobe.",
  },
  {
    id: "kuffs-houston",
    name: "Kuffs Houston",
    category: "bespoke-tailoring",
    neighborhood: "Heights-based, comes to you across Houston",
    priceTier: "$$$",
    styleTags: ["custom", "made-to-measure", "business", "black-tie"],
    bestFor: "Custom suits, shirts, and tuxedos without leaving your office. A mobile, appointment-based clothier.",
    howToBuy: "Schedule a fitting; the clothier travels to your home or office rather than running a storefront.",
    description:
      "Houston custom clothier with 20+ years of experience running a come-to-you model for suits, shirts, and tuxedos.",
    website: "https://www.kuffshouston.com/",
    knownFor: "Come-to-you custom suits, shirts, and tuxedos, measured at your home or office.",
    catersTo: "Time-pressed professionals and wedding parties.",
  },
  {
    id: "lucho",
    name: "Lucho",
    category: "bespoke-tailoring",
    neighborhood: "W Alabama St / Upper Kirby",
    priceTier: "$$$",
    styleTags: ["custom", "classic", "business"],
    bestFor: "A family-run custom tailoring shop with decades of continuous Houston operation behind it.",
    howToBuy: "Book a fitting appointment for measurements; expect multiple fittings as the garment is built.",
    description: "Family-run Houston custom tailor and luxury menswear shop operating continuously since 1989.",
    website: "https://lucho.com/",
    contact: "(832) 495-8558, call or book online",
    knownFor: "Family-run custom tailoring known for very fast custom-suit turnaround, plus luxury menswear in the shop.",
    catersTo: "Men who need real custom clothing on a real deadline.",
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
    knownFor: "Made-to-measure tailored clothing plus casual luxury, one clothier covering suits through premium denim.",
    catersTo: "Professionals outfitting both the office and the weekend through one trusted fitter.",
  },
  {
    id: "blu-fine-menswear",
    name: "BLU Fine Menswear",
    category: "bespoke-tailoring",
    neighborhood: "Houston (by appointment)",
    priceTier: "$$$",
    styleTags: ["custom", "made-to-measure", "business", "black-tie", "wedding"],
    bestFor: "Custom suits and wedding-party tuxedos from a family shop three generations deep in tailoring, with a huge fabric library to pick from.",
    howToBuy: "Book a fitting; ask about wedding-party group programs if you're outfitting a whole party at once.",
    description:
      "Family-owned Houston custom clothier, three generations of tailoring experience, building custom suits, tuxedos, and wedding suits from a library of 4,000+ fabrics.",
    website: "https://www.houstonsuitguy.com/",
    knownFor: "A 4,000+ fabric library and three generations of tailors, custom suits and wedding tuxedos.",
    catersTo: "Grooms, wedding parties, and men who want maximum fabric choice.",
  },
  {
    id: "indochino-galleria",
    name: "Indochino",
    category: "bespoke-tailoring",
    neighborhood: "The Galleria",
    priceTier: "$$",
    styleTags: ["made-to-measure", "business", "modern", "wedding", "entry-custom"],
    bestFor: "The most affordable on-ramp to made-to-measure, a custom-measured suit at an off-the-rack price for a guy not ready for a four-figure tailor.",
    howToBuy: "Book a showroom appointment online; a stylist measures you and walks you through fabric and detail choices, then the suit ships in about three weeks.",
    description:
      "Made-to-measure suiting showroom on the Galleria's first floor, suits starting around $399, measured in person by a stylist and cut to your dimensions. Not bespoke, but real custom fit at a fraction of traditional pricing.",
    website: "https://www.indochino.com/showroom/houston",
    knownFor: "Made-to-measure suits at off-the-rack prices, measured in person by a stylist, built to your dimensions in ~3 weeks.",
    catersTo: "First-time custom buyers and budget-conscious professionals.",
  },
  {
    id: "bzach-clothier",
    name: "Bzach Clothier",
    category: "bespoke-tailoring",
    neighborhood: "Houston (by appointment)",
    priceTier: "$$$",
    styleTags: ["custom", "bespoke", "business", "black-tie"],
    bestFor: "Old-school bespoke construction for a guy who wants the full hand-tailored process, not just made-to-measure.",
    howToBuy: "Book a consultation; expect multiple fittings as a true bespoke garment is built by hand.",
    description:
      "Houston bespoke tailoring house blending old-school hand craftsmanship with modern precision for custom suits, tuxedos, and shirts.",
    website: "https://bzachclothier.com/",
    knownFor: "Old-school hand-cut bespoke construction with the full multi-fitting process behind it.",
    catersTo: "Purists who want true bespoke craftsmanship.",
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
    contact: "(713) 626-1234, appointments via festariformen.com/appointment",
    knownFor: "Luxury suiting in Zegna, Loro Piana, and Scabal cloths, off-the-rack through bespoke, plus tuxedos.",
    catersTo: "Executives and gala-goers shopping the Post Oak corridor.",
  },

  // ---- Luxury department & designer ----
  {
    id: "m-penner",
    name: "M Penner",
    category: "luxury-department",
    neighborhood: "Uptown Park",
    priceTier: "$$$$",
    styleTags: ["classic", "business", "black-tie", "designer"],
    bestFor: "The one-stop institution, designer ready-to-wear plus in-house custom suiting under one roof.",
    howToBuy: "Walk in or book a fitting appointment with a stylist; expect knowledgeable staff who will measure you for both off-the-rack and custom pieces.",
    description:
      "Houston's most storied high-end menswear retailer, running since the early 1900s. Carries designer suits, sportswear, and dress furnishings, with a strong made-to-measure program.",
    website: "https://www.mpenner.com/",
    contact: "(713) 527-8200",
    knownFor: "Houston's storied independent luxury shop, curated designer tailoring and sportswear with real stylists and made-to-measure.",
    catersTo: "Men who want a relationship with one great shop instead of a mall.",
  },
  {
    id: "neiman-marcus-galleria",
    name: "Neiman Marcus",
    category: "luxury-department",
    neighborhood: "The Galleria",
    priceTier: "$$$$",
    styleTags: ["designer", "classic", "business", "black-tie"],
    bestFor: "Top-shelf designer suiting, outerwear, and accessories from the world's major fashion houses.",
    howToBuy: "Walk in, or ask for a personal shopper, free service that will pull looks to your budget and event ahead of a visit.",
    description:
      "Full-line Neiman Marcus flagship inside the Galleria complex, carrying men's designer clothing, shoes, and accessories from top international labels.",
    website: "https://www.neimanmarcus.com/stores/houston/tx/houston+-+galleria",
    knownFor: "Top international designer collections across clothing, shoes, and accessories, with free personal shoppers.",
    catersTo: "Designer-label shoppers who want the full houses under one roof.",
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
    knownFor: "A broad designer menswear floor with deep seasonal markdowns.",
    catersTo: "Label-conscious shoppers who also love a sale rack.",
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
      "The most forgiving on-ramp of the Galleria luxury stores, contemporary and designer menswear side by side, with alterations included on many purchases.",
    website: "https://www.nordstrom.com/store-details/united-states/tx/houston/nordstrom-houston-galleria",
    knownFor: "The wear-to-work through designer range with free alterations and famously easy returns.",
    catersTo: "Men still dialing in their fit. The lowest-risk place in Houston to experiment.",
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
    knownFor: "Benchmark Italian suiting and refined casualwear, with in-store made-to-measure.",
    catersTo: "Executives investing in top-tier Italian tailoring.",
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
    knownFor: "Hand-tailored Italian luxury, among the finest ready-to-wear suits made anywhere, plus bespoke service.",
    catersTo: "The very top of the budget range, C-suite and special-occasion dressing.",
  },

  {
    id: "brunello-cucinelli-river-oaks",
    name: "Brunello Cucinelli",
    category: "luxury-department",
    neighborhood: "River Oaks District",
    priceTier: "$$$$",
    styleTags: ["designer", "italian-tailoring", "classic", "luxury-casual"],
    bestFor: "The top of Italian quiet-luxury casualwear and tailoring, cashmere, suede, and knitwear built to be worn, not just looked at.",
    howToBuy: "Walk in to the River Oaks District boutique; staff will build a full head-to-toe look around a piece you're drawn to.",
    description:
      "Italian luxury house boutique in the River Oaks District specializing in refined, understated tailoring and cashmere for the modern gentleman.",
    website: "https://www.riveroaksdistrict.com/brunello-cucinelli",
    knownFor: "Quiet-luxury cashmere, unstructured tailoring, and refined casual, logo-free elegance.",
    catersTo: "Understated luxury buyers who want quality whispered, not shouted.",
  },
  {
    id: "hermes-river-oaks",
    name: "Hermès",
    category: "luxury-department",
    neighborhood: "River Oaks District",
    priceTier: "$$$$",
    styleTags: ["designer", "leather-goods", "accessories", "luxury-casual"],
    bestFor: "The pinnacle of leather goods, ties, and accessories. A belt or briefcase from here outlasts and outclasses everything else in the closet.",
    howToBuy: "Walk in to the two-story River Oaks District flagship; for high-demand leather pieces, build a relationship with a sales associate rather than expecting same-day availability.",
    description:
      "Two-story Hermès flagship in the River Oaks District spanning all sixteen of the house's métiers, men's ready-to-wear, ties, belts, small leather goods, and footwear included. In Houston since 1988.",
    website: "https://www.hermes.com/us/en/find-store/united-states/houston/hermes-houston-5HWTEY0C/",
    contact: "(713) 623-2177",
    knownFor: "Ties, belts, and small leather goods that outlast and outclass everything else, all sixteen métiers on two floors.",
    catersTo: "Accessory-first luxury buyers and collectors.",
  },
  {
    id: "louis-vuitton-mens-galleria",
    name: "Louis Vuitton Men's",
    category: "luxury-department",
    neighborhood: "The Galleria",
    priceTier: "$$$$",
    styleTags: ["designer", "leather-goods", "luxury-casual", "accessories"],
    bestFor: "Top-shelf leather goods, shoes, and ready-to-wear from one of fashion's biggest houses, including on-site personalization.",
    howToBuy: "Walk in to the dedicated men's store (separate from the main Galleria LV store); ask about the on-site hot-stamping personalization on leather goods.",
    description:
      "Dedicated Louis Vuitton men's boutique inside the Galleria carrying ready-to-wear, leather goods, shoes, watches, and accessories, with in-store personalization.",
    website: "https://us.louisvuitton.com/eng-us/point-of-sale/usa/louis-vuitton-houston-mens",
    knownFor: "Leather goods, sneakers, and ready-to-wear from fashion's biggest house, with hot-stamp personalization.",
    catersTo: "Fashion-forward shoppers and statement-piece buyers.",
  },

  // ---- Formal wear (tuxedo rental & purchase) ----
  {
    id: "the-black-tux-galleria",
    name: "The Black Tux",
    category: "formal-wear",
    neighborhood: "The Galleria",
    priceTier: "$$$",
    styleTags: ["formal", "black-tie", "modern", "rent-or-buy", "wedding"],
    bestFor: "A modern, well-fitted tuxedo or suit for a wedding or gala, rent or buy, with an actual showroom to try it on first.",
    howToBuy: "Book a free showroom appointment online first, try on your exact size in person, then order online for the event.",
    description:
      "Modern formalwear company with a Galleria-area showroom, rent or buy tuxedos and suits online after trying on your exact size in person.",
    website: "https://theblacktux.com/pages/showroom/houston-galleria",
    knownFor: "Modern-cut tuxedo and suit rental or purchase, with try-before-you-order showroom fittings.",
    catersTo: "Grooms and gala-goers, especially outfitting a wedding party across cities.",
  },
  {
    id: "als-formal-wear",
    name: "Al's Formal Wear",
    category: "formal-wear",
    neighborhood: "Multiple Houston-area locations",
    priceTier: "$$",
    styleTags: ["formal", "black-tie", "rent-or-buy", "wedding"],
    bestFor: "The budget-friendly, walk-in option for a tux rental, especially useful for outfitting an entire wedding party fast.",
    howToBuy: "Walk in for measurements well ahead of the event date; reported service quality varies by location, so confirm your order details in writing.",
    description:
      "Houston-headquartered formalwear chain renting and selling tuxedos across multiple Texas locations, a long-running local name for prom, wedding, and black-tie rentals.",
    website: "https://www.alsformalwears.com/",
    knownFor: "Walk-in tuxedo rental at the budget end, with locations all over greater Houston.",
    catersTo: "Prom, quinceañera, and wedding parties keeping costs down.",
  },

  // ---- Big & tall ----
  {
    id: "dxl-big-tall",
    name: "DXL Big + Tall",
    category: "big-tall",
    neighborhood: "Uptown / Westheimer Rd",
    priceTier: "$$",
    styleTags: ["big-and-tall", "business", "business-casual", "casual"],
    bestFor: "A guy who needs real big & tall sizing, up to 8X and a 72-inch waist, without settling for whatever fits off a standard rack.",
    howToBuy: "Walk in; larger fitting rooms and staff who specialize in big & tall fit make this an easier in-person fitting than a standard department store.",
    description:
      "Dedicated big & tall menswear retailer with a Houston storefront carrying sizes up to 8X and waist 72, spanning everyday, business, and dress categories.",
    website: "https://stores.dxl.com/us/tx/houston/5393-westheimer-road",
    knownFor: "A genuine big & tall range, up to 8X and a 72-inch waist, across casual through dress.",
    catersTo: "Big & tall men tired of settling for whatever fits at standard stores.",
  },

  // ---- Contemporary & smart-casual boutiques ----
  {
    id: "sid-mashburn",
    name: "Sid Mashburn",
    category: "contemporary-boutique",
    neighborhood: "River Oaks Blvd at Westheimer",
    priceTier: "$$$$",
    styleTags: ["classic", "smart-casual", "business", "made-to-measure", "americana"],
    bestFor: "The whole 'effortless but correct' wardrobe in one store: tailored clothing, five-pocket pants, knits, and shoes that all work together, with in-house tailoring and MTM.",
    howToBuy: "Walk in, the staff are famously hands-on and will build outfits with you; in-house tailoring on site, and ask about made-to-measure for suiting.",
    description:
      "Atlanta-born menswear shop beloved by style editors nationwide, with its Houston store at River Oaks Blvd and Westheimer. Own-label tailored and casual clothing, a curated shoe wall, made-to-measure, and an in-house tailor.",
    website: "https://shopmashburn.com/blogs/sid-mashburn-locations/houston-tx",
    contact: "(713) 936-9502",
    knownFor: "The 'effortless but correct' wardrobe in one store, own-label tailoring, five-pocket pants, knits, and a curated shoe wall, with famously hands-on staff.",
    catersTo: "Men who want one tasteful store to dress them head to toe.",
  },
  {
    id: "suitsupply-river-oaks-district",
    name: "Suitsupply",
    category: "contemporary-boutique",
    neighborhood: "West Ave / Upper Kirby (2601 Westheimer)",
    priceTier: "$$$",
    styleTags: ["modern", "business", "smart-casual", "made-to-measure"],
    bestFor: "Modern, slimmer-cut suiting at a real price with same-day options and a made-to-measure upgrade path.",
    howToBuy: "Walk in, in-store tailors do fit adjustments same-visit; ask about the made-to-measure program for a more built-for-you result.",
    description:
      "European-owned suiting shop with a sharper, more fashion-forward cut than the traditional Houston houses. Good middle rung between department-store suits and full custom.",
    website: "https://suitsupply.com/en-us/stores/houston",
    knownFor: "Sharp, slim European tailoring in Italian fabrics at mid prices, with same-visit in-house alterations.",
    catersTo: "Young professionals and modern dressers stepping up from mall suits.",
  },
  {
    id: "rye-51",
    name: "Rye 51",
    category: "contemporary-boutique",
    neighborhood: "Kirby Dr / Upper Kirby",
    priceTier: "$$$",
    styleTags: ["contemporary", "smart-casual", "denim", "designer"],
    bestFor: "The casual, off-duty counterpart to Q Clothier next door: contemporary designer denim and sportswear.",
    howToBuy: "Walk in; the shop sits beside Q Clothier's custom side for guys who want both in one stop.",
    description:
      "Contemporary menswear boutique carrying designer casualwear and denim (brands like Diesel and John Varvatos), sister shop to Q Clothier.",
    website: "https://rye51.com/pages/houston",
    knownFor: "Contemporary designer casualwear and denim, one door from Q Clothier's custom side.",
    catersTo: "The off-duty wardrobe of a custom-suit customer.",
  },
  {
    id: "premium-goods",
    name: "Premium Goods",
    category: "contemporary-boutique",
    neighborhood: "Montrose area",
    priceTier: "$$$",
    styleTags: ["streetwear", "sneakers", "contemporary", "smart-casual"],
    bestFor: "The guy whose smart-casual and weekend rotation runs through sneakers. A real sneaker and streetwear boutique rather than a mall chain.",
    howToBuy: "Walk in for in-stock pairs; limited/hyped releases may require following their release calendar or app instead of assuming walk-in stock.",
    description:
      "Houston sneaker and streetwear boutique running since 2004, carrying everything from classic silhouettes to limited-edition releases alongside curated streetwear.",
    website: "https://premiumgoods.com/",
    knownFor: "Houston sneaker culture since 2004, classic silhouettes through limited releases, plus curated streetwear.",
    catersTo: "Sneakerheads and casual-first dressers.",
  },
  {
    id: "buck-mason",
    name: "Buck Mason",
    category: "contemporary-boutique",
    neighborhood: "Montrose Collective",
    priceTier: "$$$",
    styleTags: ["casual", "smart-casual", "denim", "basics", "modern"],
    bestFor: "Elevated everyday basics, the tees, denim, and knits that carry the casual side of a rebuilt wardrobe without looking like generic mall gear.",
    howToBuy: "Walk in to the Montrose Collective storefront; sizing runs true and the staff can match washes and weights to what you already own.",
    description:
      "Los Angeles menswear brand's Houston store in Montrose Collective, premium t-shirts, denim, sweats, and cashmere with a clean, masculine, no-logo aesthetic.",
    website: "https://www.buckmason.com/",
    knownFor: "Elevated no-logo basics, premium tees, denim, sweats, and cashmere with a clean masculine cut.",
    catersTo: "Minimalists building a quality casual foundation.",
  },
  {
    id: "marine-layer-rice-village",
    name: "Marine Layer",
    category: "contemporary-boutique",
    neighborhood: "Rice Village",
    priceTier: "$$",
    styleTags: ["casual", "soft-basics", "weekend", "lightweight"],
    bestFor: "Ultra-soft, lightweight casual pieces that make sense in Houston heat. The weekend layer of the wardrobe at an approachable price.",
    howToBuy: "Walk in at Rice Village; fabrics are the whole point here, so touch before you buy and size for a relaxed drape.",
    description:
      "San Francisco brand's Rice Village shop specializing in extremely soft re-spun cotton tees, casual button-downs, and light layers, well matched to Houston's climate.",
    website: "https://www.marinelayer.com/",
    knownFor: "Absurdly soft re-spun cotton tees, button-downs, and light layers built for heat.",
    catersTo: "Comfort-first weekend dressers in the Houston climate.",
  },
  {
    id: "manready-mercantile",
    name: "Manready Mercantile",
    category: "contemporary-boutique",
    neighborhood: "Houston Heights",
    priceTier: "$$$",
    styleTags: ["contemporary", "smart-casual", "workwear-inspired", "grooming"],
    bestFor: "Elevated casual and curated goods, the shop for a guy who wants quality basics and grooming without a dress code.",
    howToBuy: "Walk in; inventory mixes new pieces with vintage finds, so it rewards checking back in person.",
    description:
      "Heights neighborhood general-goods shop for men, clothing, shoes, accessories, grooming, and home goods, mixing new pieces with vintage finds from the owners' travels.",
    website: "https://manready.com/",
    knownFor: "A Heights general store for men, clothing, grooming, leather goods, candles, and vintage finds.",
    catersTo: "Gift shoppers and guys furnishing a masculine everyday kit.",
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
    knownFor: "Handmade boots since 1883, classic and exotic leathers, with custom programs for exact fit.",
    catersTo: "The buy-once-cry-once boot buyer.",
  },
  {
    id: "cavenders",
    name: "Cavender's Boot City",
    category: "western-boots-leather",
    neighborhood: "Multiple Houston-area locations",
    priceTier: "$$",
    styleTags: ["western", "casual", "workwear"],
    bestFor: "Quality Western basics like jeans, boots, and hats at a real-world price point.",
    howToBuy: "Walk in; wide size runs make this the easiest Western store for an off-the-rack fit.",
    description:
      "The accessible end of Houston Western wear: boots and denim from Ariat, Justin, Lucchese, and more, without bespoke pricing. Multiple locations across greater Houston.",
    website: "https://www.cavenders.com/",
    knownFor: "Wide-range western basics, Ariat, Justin, Lucchese and more, at real-world prices.",
    catersTo: "Practical western wear and rodeo-season outfitting.",
  },
  {
    id: "tecovas-rice-village",
    name: "Tecovas",
    category: "western-boots-leather",
    neighborhood: "Rice Village",
    priceTier: "$$",
    styleTags: ["western", "casual", "leather-goods", "modern-western"],
    bestFor: "A first pair of quality western boots without the four-figure commitment. Modern, handmade, and priced honestly.",
    howToBuy: "Walk in to the Rice Village store (there's also a City Centre location); staff will fit you properly, and the store has an on-site boot shine stand.",
    description:
      "Austin-born direct-to-consumer bootmaker's Rice Village store, handmade western boots, jeans, and leather goods at a sharply lower price than heritage bootmakers, with real in-store fitting.",
    website: "https://www.tecovas.com/stores/houston-tx-rice-village",
    contact: "(832) 481-7020",
    knownFor: "Handmade western boots at direct-to-consumer prices, with a friendly first-boot fitting experience.",
    catersTo: "First-time boot buyers and modern western-wear fans.",
  },
  {
    id: "republic-boot-co",
    name: "Republic Boot Co",
    category: "western-boots-leather",
    neighborhood: "Houston Heights",
    priceTier: "$$$$",
    styleTags: ["western", "custom", "bespoke-boots", "leather-goods"],
    bestFor: "Fully custom, made-in-Houston cowboy boots, third-generation bootmakers building to your foot and your design, guaranteed for life.",
    howToBuy: "Visit the Heights shop or call to start a custom order; custom builds start around $1,800 and take time, so order well ahead of any event.",
    description:
      "One of the last true on-site custom bootmakers in Houston, third-generation craftsmen in the Heights building roughly ten pairs a week by hand on century-old equipment, with work guaranteed for life.",
    website: "https://republicboothouston.com/",
    contact: "(832) 767-6586",
    knownFor: "Fully custom cowboy boots built by hand in Houston by third-generation makers, guaranteed for life.",
    catersTo: "Serious boot people who want one-of-one, made for their foot.",
  },
  {
    id: "the-hat-store",
    name: "The Hat Store",
    category: "western-boots-leather",
    neighborhood: "Richmond Ave / Galleria area",
    priceTier: "$$$",
    styleTags: ["hats", "custom", "western", "classic"],
    bestFor: "A truly custom hat, western or otherwise, shaped and fitted to your head by the only shop of its kind left in Houston.",
    howToBuy: "Walk in; they measure your head, shape the hat to your face and preference on the spot, and can build fully custom hats, belts, and buckles.",
    description:
      "Houston institution dating to 1915 and the city's last true custom hat shop, western hats, fedoras, and dress hats shaped and fitted in-house, plus custom belts and buckles.",
    website: "https://www.thehatstore.com/",
    contact: "(713) 780-2480",
    knownFor: "Custom hats shaped to your head on the spot, western and dress, since 1915.",
    catersTo: "Anyone serious about a hat that genuinely fits.",
  },
  {
    id: "pinto-ranch",
    name: "Pinto Ranch",
    category: "western-boots-leather",
    neighborhood: "Uptown / Post Oak Blvd",
    priceTier: "$$$$",
    styleTags: ["western", "classic", "leather-goods", "black-tie-western"],
    bestFor: "High-end Western wear a step above Cavender's, handmade boots and curated western fashion for rodeo season or a Texas-formal event.",
    howToBuy: "Walk in to the Post Oak Plaza location; custom hat shaping and exotic-skin boots may need a special order.",
    description:
      "Upscale Western apparel retailer known for handmade boots and a curated selection of high-end western wear, hats, and jewelry.",
    website: "https://pintoranch.com/",
    knownFor: "High-end western fashion, handmade boots, custom hat shaping, and dress-western for Texas-formal events.",
    catersTo: "Rodeo galas and the dressed-up end of western wear.",
  },

  // ---- Footwear ----
  {
    id: "allen-edmonds-houston",
    name: "Allen Edmonds",
    category: "footwear",
    neighborhood: "Lamar / River Oaks area",
    priceTier: "$$$",
    styleTags: ["classic", "business", "leather-goods"],
    bestFor: "Recraftable American dress shoes, the pair that anchors a business wardrobe for a decade of resoling.",
    howToBuy: "Walk in for fitting; ask about the recrafting program before ever discarding a pair that's worn out.",
    description:
      "Classic American shoemaker's Houston storefront, oxfords, derbies, and loafers built to be resoled rather than replaced.",
    website: "https://www.allenedmonds.com/stores/tx/houston/77098/lamar-river-oaks-39116",
    knownFor: "Recraftable Goodyear-welted dress shoes, resoled for a decade-plus of service.",
    catersTo: "Professionals buying shoes as a long-term investment.",
  },

  {
    id: "johnston-murphy-galleria",
    name: "Johnston & Murphy",
    category: "footwear",
    neighborhood: "The Galleria",
    priceTier: "$$$",
    styleTags: ["classic", "business", "business-casual", "comfort"],
    bestFor: "Versatile business and business-casual shoes a notch below Allen Edmonds in price, hybrid dress-sneaker styles included.",
    howToBuy: "Walk in at the Galleria (Level 1 near the Yellow garage); get both feet measured and ask about their more casual hybrid lines for business-casual offices.",
    description:
      "165-year-old American shoemaker's Galleria store carrying dress shoes, casual leather sneakers, and business-casual hybrids plus belts and small leather goods.",
    website: "https://www.johnstonmurphy.com/",
    contact: "(713) 961-0025",
    knownFor: "Versatile business and business-casual shoes, including dress-sneaker hybrids.",
    catersTo: "Everyday office footwear a step below premium prices.",
  },

  // ---- Alterations & tailoring ----
  {
    id: "qc-tailors",
    name: "QC Tailors",
    category: "alterations",
    neighborhood: "Upper Kirby",
    priceTier: "$$",
    styleTags: ["alterations", "tailoring", "suit-work"],
    bestFor: "The independent alterations shop for everything you already own or buy off the rack elsewhere: shirt darts, trouser tapers, jacket work.",
    howToBuy: "Walk in with your pieces (bring the shoes you'll wear with trousers so hems get set right); typical turnaround runs days, ask for a written ticket with pickup date.",
    description:
      "Upper Kirby's tailor since 1998, a dedicated alterations and dress-work shop, the place plans in this app send you to make off-the-rack pieces fit like they were made for you.",
    website: "https://qctailors.com/",
    contact: "(713) 520-6090",
    knownFor: "Alterations and dress work, shirt darts, trouser tapers, jacket surgery, in Upper Kirby since 1998.",
    catersTo: "Anyone making off-the-rack clothes fit like they were made for them.",
  },

  // ---- Eyewear & opticians ----
  {
    id: "warby-parker-rice-village",
    name: "Warby Parker",
    category: "eyewear",
    neighborhood: "Rice Village",
    priceTier: "$$",
    styleTags: ["eyewear", "glasses", "sunglasses", "modern"],
    bestFor: "Well-designed frames matched to your face shape without a luxury price. Glasses from around $95, with styling help in-store.",
    howToBuy: "Walk in at Rice Village; try frames freely and ask an advisor to pull shapes for your face, eye exams available on-site.",
    description:
      "Warby Parker's Rice Village store, in-house-designed prescription glasses and sunglasses at accessible prices, with expert frame-styling help and on-site eye exams.",
    website: "https://stores.warbyparker.com/tx/houston/2518-university-blvd",
    contact: "(832) 301-9886",
    knownFor: "In-house designed frames from about $95, on-site eye exams, and staff who style frames to your face shape.",
    catersTo: "Value-smart glasses wearers.",
  },
  {
    id: "eye-elegance",
    name: "Eye Elegance",
    category: "eyewear",
    neighborhood: "Post Oak Blvd / Galleria area (also Montrose)",
    priceTier: "$$$$",
    styleTags: ["eyewear", "designer", "luxury", "rare-frames"],
    bestFor: "The luxury end of eyewear, rare and special-edition designer frames hand-picked from around the world, fitted by real opticians.",
    howToBuy: "Walk in to the Post Oak Plaza or Montrose boutique; bring your prescription, and let them match frame geometry to your face shape.",
    description:
      "Houston luxury optical boutique (Post Oak and Montrose locations) carrying hand-picked international designer frames, Cartier, Matsuda, and hard-to-find special editions, with premium lenses and fitting.",
    website: "https://eyeelegance.com/",
    contact: "(713) 322-5541",
    knownFor: "Rare international designer frames, Cartier, Matsuda, special editions, fitted by real opticians.",
    catersTo: "Statement-eyewear buyers and luxury frame collectors.",
  },

  // ---- Lifestyle & accessories ----
  {
    id: "kuhl-linscomb",
    name: "Kuhl-Linscomb",
    category: "lifestyle-accessories",
    neighborhood: "West Alabama St / Montrose",
    priceTier: "$$$",
    styleTags: ["grooming", "accessories", "gifts"],
    bestFor: "Finishing touches, grooming products, small leather goods, and gift-worthy accessories to round out a wardrobe.",
    howToBuy: "Walk in; this sprawling multi-building store is a browse-and-discover shop more than an appointment one.",
    description:
      "Upscale Houston lifestyle store spanning five buildings and 100,000+ square feet, best known for home goods and gifts, but a reliable source for men's grooming and small accessories.",
    website: "https://www.kuhl-linscomb.com/",
    knownFor: "A sprawling five-building lifestyle store, men's grooming, small leather goods, and gift-worthy accessories.",
    catersTo: "Finishing-touch and gift shopping.",
  },
  {
    id: "zadok-jewelers",
    name: "Zadok Jewelers",
    category: "lifestyle-accessories",
    neighborhood: "Post Oak Blvd / Galleria area",
    priceTier: "$$$$",
    styleTags: ["watches", "jewelry", "finishing-touches"],
    bestFor: "A real watch, new or pre-owned, the accessory that finishes a high-end wardrobe.",
    howToBuy: "Walk in or book a private appointment; ask about pre-owned/certified options if buying new is out of budget.",
    description:
      "Houston luxury watch and jewelry retailer carrying brands like Cartier, Grand Seiko, Tudor, and Ulysse Nardin, including pre-owned Swiss watches.",
    website: "https://zadok.com/",
    knownFor: "New and certified pre-owned Swiss watches, Cartier, Grand Seiko, Tudor, from a family-run Houston institution.",
    catersTo: "The first real watch through collector-grade pieces.",
  },
];

import { STORE_FRESHNESS } from "./storeFreshness";
import { STORE_INTEL } from "./storeIntel";
import { STORE_SOCIAL } from "./storeSocial";

// The monthly refresh job (scripts/refresh-data.ts) re-verifies each store
// with live web search. Its overlay is applied here: a store flagged
// "closed" with high confidence disappears from every consumer, and each
// surviving store carries its current seasonal note + verification date.
function withFreshness(store: HoustonStore): HoustonStore {
  const f = STORE_FRESHNESS[store.id];
  const intel = STORE_INTEL[store.id];
  const social = STORE_SOCIAL[store.id];
  const enriched: HoustonStore = {
    ...store,
    ...(intel
      ? {
          brands: intel.brands.length > 0 ? intel.brands : undefined,
          pricePoints: intel.pricePoints.length > 0 ? intel.pricePoints : undefined,
          insiderTake: intel.insiderTake || undefined,
        }
      : {}),
    ...(social ? { instagram: social.instagram, facebook: social.facebook } : {}),
  };
  if (!f) return enriched;
  return { ...enriched, seasonalNote: f.note || undefined, lastVerified: f.checkedAt };
}

function isOperating(store: HoustonStore): boolean {
  const f = STORE_FRESHNESS[store.id];
  return !(f && f.status === "closed" && f.confidence === "high");
}

export function getAllStores(): HoustonStore[] {
  return HOUSTON_STORES.filter(isOperating).map(withFreshness);
}

export function getStoresByCategory(category: StoreCategory): HoustonStore[] {
  return getAllStores().filter((s) => s.category === category);
}

export const STORE_CATEGORY_LABELS: Record<StoreCategory, string> = {
  "bespoke-tailoring": "Bespoke & Made-to-Measure Tailors",
  "luxury-department": "Luxury Department & Multi-Brand",
  "western-boots-leather": "Western Wear & Boots",
  "contemporary-boutique": "Contemporary & Smart-Casual Boutiques",
  footwear: "Footwear",
  "lifestyle-accessories": "Lifestyle & Accessories",
  "formal-wear": "Tuxedos & Formal Wear",
  "big-tall": "Big & Tall",
  alterations: "Alterations & Tailoring",
  eyewear: "Eyewear & Opticians",
};
