/**
 * Kyla's Starter Staples — the free sample of the app's power.
 *
 * Four Houston industries x three career levels x the TWO pieces Kyla
 * would force each man to buy first, with cost-reasoned store picks and
 * honest price ballparks. Static by design: it renders instantly, costs
 * nothing to serve, and is deliberately a teaser — the real product is
 * the interview and the 14-item plan built to one man's face, budget,
 * and zip code.
 */

export interface Staple {
  item: string;
  priceRange: string;
  store: string;
  storeWebsite: string;
  whyThisStore: string;
  kylaSays: string;
}

export interface LevelStaples {
  level: string;
  levelTag: string;
  intro: string;
  staples: [Staple, Staple];
}

export interface IndustryStaples {
  id: string;
  industry: string;
  emojiTag: string;
  hook: string;
  levels: [LevelStaples, LevelStaples, LevelStaples];
}

export const STARTER_STAPLES: IndustryStaples[] = [
  {
    id: "energy",
    industry: "Energy & Trading",
    emojiTag: "⚡",
    hook: "The AC is set to 64 and the guy across the desk can read a P&L off your lapel. Dress accordingly.",
    levels: [
      {
        level: "New to the desk",
        levelTag: "STARTING OUT",
        intro: "You're not out-dressing the MD — you're out-dressing the other analysts. Cheaper than you think.",
        staples: [
          {
            item: "Navy tropical-weight suit",
            priceRange: "$500–$700",
            store: "Suitsupply",
            storeWebsite: "https://suitsupply.com/en-us/stores/houston",
            whyThisStore: "Sharp slim tailoring at analyst money, and the in-house tailor fixes the fit the same visit — no second trip.",
            kylaSays: "One navy suit does client days, CERAWeek, and the wedding you'll get dragged to. It's the Swiss Army knife; the quarter-zip is the butter knife.",
          },
          {
            item: "Black cap-toe oxfords",
            priceRange: "$150–$200",
            store: "Johnston & Murphy",
            storeWebsite: "https://www.johnstonmurphy.com/",
            whyThisStore: "Real leather dress shoes at a first-bonus-is-someday price — upgrade the shoes when the title upgrades.",
            kylaSays: "Nobody trusts a trade from a man in square-toed loafers. I don't make the rules; the trading floor does.",
          },
        ],
      },
      {
        level: "Mid-level",
        levelTag: "ESTABLISHED",
        intro: "You've got the book of business. Time your clothes stopped saying 'still an analyst.'",
        staples: [
          {
            item: "Made-to-measure suit (navy or charcoal)",
            priceRange: "$800–$1,200",
            store: "Q Clothier",
            storeWebsite: "https://qclothier.com/pages/houston",
            whyThisStore: "Custom-measured with one of the faster turnarounds in town — order in January, wear it at CERAWeek in March.",
            kylaSays: "Off-the-rack got you here. Custom is how the room knows you're staying. Also: pockets that lie flat. Life-changing.",
          },
          {
            item: "Two paper-pattern dress shirts",
            priceRange: "$200–$300 each",
            store: "Hamilton Shirts",
            storeWebsite: "https://hamiltonshirts.com/",
            whyThisStore: "They hand-cut your pattern and keep it on file forever — made in Houston since 1883, and reorders fit without a fitting.",
            kylaSays: "A custom shirt is the cheapest thing that makes an expensive suit look expensive. The collar sits right on every call, every quarter.",
          },
        ],
      },
      {
        level: "High-end",
        levelTag: "CORNER OFFICE",
        intro: "At this level nobody should be able to name what you're wearing — just that it's correct.",
        staples: [
          {
            item: "Italian suit, made-to-measure",
            priceRange: "$3,000–$4,500",
            store: "Zegna",
            storeWebsite: "https://www.zegna.com/us-en/store-locator/store-detail/united-states/houston/5015-westheimer-rd-ste-a3166.424/",
            whyThisStore: "The benchmark for Italian cloth, with in-store made-to-measure — top-shelf without shouting about it.",
            kylaSays: "This suit doesn't say 'money.' It says 'I decide things.' There's a difference, and everyone at the table can feel it.",
          },
          {
            item: "Tie & belt, the handshake pieces",
            priceRange: "$400–$800",
            store: "Hermès",
            storeWebsite: "https://www.hermes.com/us/en/find-store/united-states/houston/hermes-houston-5HWTEY0C/",
            whyThisStore: "The two accessories people actually see up close, from the house that makes the best ones on earth — River Oaks District, two floors.",
            kylaSays: "You shake hands for a living. The tie and belt are in every frame of that movie. Buy the good ones once.",
          },
        ],
      },
    ],
  },
  {
    id: "medicine",
    industry: "Medicine & the Med Center",
    emojiTag: "🩺",
    hook: "You live in scrubs. That's exactly why the eight hours a week you don't matter twice as much.",
    levels: [
      {
        level: "Resident",
        levelTag: "STARTING OUT",
        intro: "Your wardrobe budget survived med school. We're building your civilian exit outfit, not an office closet.",
        staples: [
          {
            item: "Unstructured navy blazer",
            priceRange: "$400–$500",
            store: "Suitsupply",
            storeWebsite: "https://suitsupply.com/en-us/stores/houston",
            whyThisStore: "Half-lined so it survives a Houston parking lot in July, tailored on-site, and it dresses up everything you already own.",
            kylaSays: "Scrubs to dinner in ninety seconds: this blazer over anything. It's the white coat's charming brother.",
          },
          {
            item: "Dark slim denim",
            priceRange: "$130–$200",
            store: "Buck Mason",
            storeWebsite: "https://www.buckmason.com/",
            whyThisStore: "Premium no-logo denim in Montrose at a resident-realistic price — the clean dark wash works under that blazer.",
            kylaSays: "Dark denim is the only jean that gets into nice restaurants without an argument. Rips are for people with time to shop.",
          },
        ],
      },
      {
        level: "Attending",
        levelTag: "ESTABLISHED",
        intro: "Conferences, donor dinners, and dates — you're visible now. Look like the doctor people request by name.",
        staples: [
          {
            item: "High-twist wool sport coat",
            priceRange: "$600–$900",
            store: "Sid Mashburn",
            storeWebsite: "https://shopmashburn.com/blogs/sid-mashburn-locations/houston-tx",
            whyThisStore: "The famously hands-on staff will build the whole look around it, and the in-house tailor sets the fit — one stop, done right.",
            kylaSays: "A great sport coat at a podium reads 'trust me' before you open your mouth. Consider it bedside manner, worn.",
          },
          {
            item: "Fine merino knits (navy + gray)",
            priceRange: "$80–$150 each",
            store: "Nordstrom",
            storeWebsite: "https://www.nordstrom.com/store-details/united-states/tx/houston/nordstrom-houston-galleria",
            whyThisStore: "The easiest returns in the Galleria while you dial in size, and free alterations on what needs a nip.",
            kylaSays: "Merino over a collar is the attending uniform nobody taught you in residency. Machine-washable authority.",
          },
        ],
      },
      {
        level: "Chief / Chair",
        levelTag: "TOP OF LICENSE",
        intro: "Gala season is basically a second call schedule for you now. Dress like the name on the building.",
        staples: [
          {
            item: "Unstructured cashmere-blend jacket",
            priceRange: "$2,500–$4,000",
            store: "Brunello Cucinelli",
            storeWebsite: "https://www.riveroaksdistrict.com/brunello-cucinelli",
            whyThisStore: "Quiet luxury, zero logos — the exact register for donor events where flash reads wrong and quality reads loud.",
            kylaSays: "Old money whispers. This jacket doesn't even whisper — it just nods, and the development office nods back.",
          },
          {
            item: "Gala-season suit, made-to-measure",
            priceRange: "$1,500–$2,500",
            store: "Festari For Men",
            storeWebsite: "https://festariformen.com/",
            whyThisStore: "Post Oak institution cutting Zegna and Loro Piana cloths — built for exactly the Houston benefit circuit you're on.",
            kylaSays: "October through December you're a professional applause-giver. The suit should survive fifteen galas and still want more.",
          },
        ],
      },
    ],
  },
  {
    id: "law",
    industry: "Law & Finance",
    emojiTag: "⚖️",
    hook: "The last industry in Houston where the suit still runs the meeting. Yours should be winning it.",
    levels: [
      {
        level: "First-year",
        levelTag: "STARTING OUT",
        intro: "Billables are brutal and so is the dress code. Custom fit at first-year money — it exists.",
        staples: [
          {
            item: "Charcoal suit, made-to-measure",
            priceRange: "$400–$650",
            store: "Indochino",
            storeWebsite: "https://www.indochino.com/showroom/houston",
            whyThisStore: "Measured in person at the Galleria showroom, cut to your body, at an off-the-rack price — the best fit-per-dollar in town.",
            kylaSays: "Charcoal first, navy second — charcoal does courtrooms, closings, and funerals without a costume change. Grim? Efficient.",
          },
          {
            item: "White & light-blue dress shirts (x3)",
            priceRange: "$60–$90 each",
            store: "Nordstrom",
            storeWebsite: "https://www.nordstrom.com/store-details/united-states/tx/houston/nordstrom-houston-galleria",
            whyThisStore: "Solid quality at volume pricing, easy returns while you learn your neck size, and non-iron options for 6am doc review.",
            kylaSays: "Three shirts, two colors, zero decisions at 5:45am. You'll bill more hours than your closet — keep it boring and crisp.",
          },
        ],
      },
      {
        level: "Senior associate",
        levelTag: "ESTABLISHED",
        intro: "You're in front of clients now. The suit count doubles and the shoes stop being negotiable.",
        staples: [
          {
            item: "Navy suit, made-to-measure",
            priceRange: "$800–$1,400",
            store: "Q Clothier",
            storeWebsite: "https://qclothier.com/pages/houston",
            whyThisStore: "Custom with a fast turnaround and a stylist who'll keep your growing rotation coherent instead of random.",
            kylaSays: "Two great suits beat five mediocre ones — rotation is what keeps them alive. Yes, suits need rest days. Like you, minus the rest.",
          },
          {
            item: "Recraftable cap-toe oxfords",
            priceRange: "$300–$450",
            store: "Allen Edmonds",
            storeWebsite: "https://www.allenedmonds.com/stores/tx/houston/77098/lamar-river-oaks-39116",
            whyThisStore: "Goodyear-welted and rebuildable — one pair, resoled for a decade, through three promotions. The best cost-per-wear math in law.",
            kylaSays: "Judges look down at the record and opposing counsel looks down at your shoes. Both should find nothing to object to.",
          },
        ],
      },
      {
        level: "Partner",
        levelTag: "NAME ON THE DOOR",
        intro: "Clients are buying judgment now. The tailoring should close before you say a word.",
        staples: [
          {
            item: "Custom suit from a Houston institution",
            priceRange: "$2,000–$3,500",
            store: "Norton Ditto",
            storeWebsite: "https://nortonditto.com/",
            whyThisStore: "Dressing Houston's corner offices since 1908, with complimentary in-house tailoring — the relationship house for a career wardrobe.",
            kylaSays: "A Norton Ditto suit is Houston shorthand for 'been winning a while.' Opposing counsel reads it. So does the jury.",
          },
          {
            item: "The tie drawer, rebuilt",
            priceRange: "$200–$300 each",
            store: "Hermès",
            storeWebsite: "https://www.hermes.com/us/en/find-store/united-states/houston/hermes-houston-5HWTEY0C/",
            whyThisStore: "The best silk in the game — and at partner level, the tie is the only place the suit lets you speak.",
            kylaSays: "Retire everything you bought in law school. A great tie at a deposition is a closing argument you get to wear.",
          },
        ],
      },
    ],
  },
  {
    id: "space-tech",
    industry: "Engineering, Space & Tech",
    emojiTag: "🚀",
    hook: "Nobody's asking you to wear a suit. They are silently judging the free vendor polo.",
    levels: [
      {
        level: "New engineer",
        levelTag: "STARTING OUT",
        intro: "The bar is on the floor — clean basics that actually fit will lap the whole standup.",
        staples: [
          {
            item: "Elevated five-pocket pants (x2)",
            priceRange: "$130–$180 each",
            store: "Buck Mason",
            storeWebsite: "https://www.buckmason.com/",
            whyThisStore: "No-logo premium basics in Montrose — the jeans-but-better cut that works from clean room to happy hour.",
            kylaSays: "Cargo shorts are for holding tools, not careers. These are the pants that quietly get you invited to the customer meeting.",
          },
          {
            item: "Clean leather sneakers",
            priceRange: "$150–$200",
            store: "Johnston & Murphy",
            storeWebsite: "https://www.johnstonmurphy.com/",
            whyThisStore: "The dress-sneaker hybrids split the difference perfectly — lab-floor comfortable, demo-day presentable.",
            kylaSays: "White, leather, spotless. The running shoes are for running. Are you running? Then no.",
          },
        ],
      },
      {
        level: "Lead / Manager",
        levelTag: "ESTABLISHED",
        intro: "You present now — to customers, program managers, maybe a review board. One jacket changes everything.",
        staples: [
          {
            item: "Unstructured blazer (navy or olive)",
            priceRange: "$400–$500",
            store: "Suitsupply",
            storeWebsite: "https://suitsupply.com/en-us/stores/houston",
            whyThisStore: "Soft-shouldered so it doesn't read 'sales guy,' tailored same-visit, and it lives on your chair for surprise VP drop-ins.",
            kylaSays: "A blazer over a t-shirt is tech-lead formalwear. It says 'I own this roadmap' louder than the slide deck does.",
          },
          {
            item: "Merino polos & tees (x3)",
            priceRange: "$70–$120 each",
            store: "Marine Layer",
            storeWebsite: "https://www.marinelayer.com/",
            whyThisStore: "Rice Village stop, absurdly soft, breathes through the parking-lot-to-lobby furnace — engineered fabric for an engineer.",
            kylaSays: "Same comfort as the conference-swag tee, except this one doesn't have a vendor logo doing your talking.",
          },
        ],
      },
      {
        level: "Founder / VP",
        levelTag: "MISSION CONTROL",
        intro: "Investors, customers, cameras. Houston founder energy — polished, zero corporate costume.",
        staples: [
          {
            item: "The head-to-toe jacket",
            priceRange: "$700–$1,100",
            store: "Sid Mashburn",
            storeWebsite: "https://shopmashburn.com/blogs/sid-mashburn-locations/houston-tx",
            whyThisStore: "One store that dresses you completely with actual taste — the staff builds the outfit around your life, not a lookbook.",
            kylaSays: "The 'effortless' look takes exactly one great jacket and a store this good. Everyone will assume you woke up like this. Let them.",
          },
          {
            item: "Proper western boots",
            priceRange: "$250–$360",
            store: "Tecovas",
            storeWebsite: "https://www.tecovas.com/stores/houston-tx-rice-village",
            whyThisStore: "Handmade boots at an honest price with a real first-boot fitting — the approachable door into Houston's signature move.",
            kylaSays: "A Houston founder in good boots at a pitch is a cheat code. Coastal VCs physically cannot resist it. Use responsibly.",
          },
        ],
      },
    ],
  },
];

export const STAPLES_DISCLAIMER =
  "Prices are honest Houston ballparks, not quotes — and these twelve lists are the free sample. The real thing is a 14-item plan built to your face, your budget, your zip code, and your calendar.";
