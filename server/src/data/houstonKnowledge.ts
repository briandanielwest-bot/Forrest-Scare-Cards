import { PRICE_BRIEF, PRICE_BRIEF_DATE } from "./priceBrief";

/**
 * Houston expertise packs — deep domain knowledge encoded as DATA so
 * agents apply it instead of deriving it (faster + more consistent), and
 * so the stable text can sit in cacheable system prompts.
 *
 * Load-bearing calendar facts verified via live web search (CERAWeek at
 * the GRB in late March; OTC at NRG in early May; Rodeo at NRG early-to-
 * late March with the cook-off the week before). Prices and drive times
 * are deliberately hedged ballparks — real enough to plan against,
 * phrased so nobody treats them as quotes.
 */

export const HOUSTON_CALENDAR = `HOUSTON YEAR IN DRESS: month by month
- Jan: mild, occasional real cold snaps (freezing happens). End-of-season markdowns citywide, the month to buy tailoring and outerwear at a discount.
- Feb: cool-mild. Go Texan Day (the Friday before rodeo) puts jeans and boots in even conservative offices; World's Championship Bar-B-Que cook-off (late Feb) kicks off rodeo season.
- Mar: THE Houston month. Rodeo runs at NRG most of the month (boots/denim get genuine formal standing at rodeo events), and CERAWeek, the world's top energy conference, packs downtown late March: for energy professionals, that is suit week, and tailoring ordered later than January won't arrive in time.
- Apr: warm, pleasant, humidity arriving. Last comfortable month for midweight fabrics.
- May: hot begins. OTC at NRG Park (early May) floods town with energy visitors, business casual with serious walking shoes is the OTC uniform.
- Jun-Sep: the furnace, 90s-100s with heavy humidity, and hurricane season underway. Tropical wool, poplin, seersucker, linen blends; unlined or half-lined only; a packable rain layer earns daily carry. Nothing heavy sells itself in stores, which is why Jul-Aug carries deep sales (Nordstrom's big Anniversary Sale typically runs mid-July into August, the year's best window for next-winter pieces at a discount).
- Oct: relief begins. Gala season opens, Houston's charity gala circuit (museums, medical philanthropy, symphony/ballet) runs Oct-Dec and is a genuinely formal, cosmopolitan black-tie scene. Buy the overcoat and formalwear NOW, before demand.
- Nov-Dec: mild days, real chilly snaps. Peak gala + holiday party season; the two sweaters and one overcoat earn their keep.
The buying rhythm: hot-weather foundation first (worn 7+ months), winter/gala capsule in Oct, rodeo-season western ahead of February, and conference tailoring (CERAWeek/OTC) ordered 6+ weeks ahead.`;

export const SHOPPING_DISTRICTS = `HOUSTON SHOPPING GEOGRAPHY: cluster errands, respect the drive
- River Oaks District (Westheimer at Willowick): Hermès, Brioni, Brunello Cucinelli, with Sid Mashburn and Suitsupply (West Ave, Westheimer at Kirby) minutes away. The luxury walking cluster.
- Galleria / Post Oak: Nordstrom, Neiman Marcus, Saks, Zegna, Louis Vuitton Men's, Indochino, Johnston & Murphy, The Black Tux inside or beside the mall; Festari, Pinto Ranch, Eye Elegance, Zadok on Post Oak; Hamilton Shirts and The Hat Store on Richmond. The densest one-trip zone in the city.
- Upper Kirby / West Alabama: Q Clothier + Rye 51 (same stop), QC Tailors, Lucho, Norton Ditto, Kuhl-Linscomb. The custom-and-alterations corridor.
- Rice Village: Tecovas, Warby Parker, Marine Layer. Casual + boots + eyewear in one walkable stop.
- Heights / Montrose: Manready Mercantile and Republic Boot Co in the Heights; Buck Mason and Premium Goods at Montrose Collective; Eye Elegance's second shop on Montrose Blvd.
- Highland Village (Westheimer): Lucchese, with Allen Edmonds close by toward River Oaks.
Drive reality (off-peak; rush hour can double it): Heights<->Downtown ~10-15 min; Heights<->Galleria or River Oaks District ~20-25; Rice Village<->Galleria ~15; Downtown<->Galleria ~20; Katy, Sugar Land, or The Woodlands to any inner-loop cluster ~35-60. Plan one cluster per outing; never send a man across town for one small item a nearer cluster covers.`;

export const INDUSTRY_DRESS_CODES = `HOUSTON INDUSTRY DRESS DECODER: what his job actually means for his closet
- Energy trading floors (downtown): business casual with a quarter-zip epidemic; jackets appear for client days. CERAWeek (late March) is his suit week, plan for it.
- O&G corporate / Energy Corridor: business casual baseline, dressier as you climb; site-visit days mean FR gear provided by work, so the wardrobe you build is his office + client side.
- Texas Medical Center: scrubs or a white coat all day, his real wardrobe need is the civilian one: dinners, conferences, dates, donor events. Don't over-invest in office wear he never wears.
- Law / banking / finance (downtown): the most formal lane left in Houston, real suits still standard for court, clients, and closings.
- Tech / startups (Ion district, EaDo, Montrose): genuinely casual; elevated basics and one great blazer beat any suit rack.
- Construction / field / industrial: workwear provided or rugged by necessity on site; his discretionary wardrobe is evenings and weekends, build for that, not a fantasy office.
- Client-facing sales (any industry): the jacket-and-shirt game is the whole game; invest there first.
- Academia / creative: relaxed, texture-friendly; interesting knitwear and casual tailoring over corporate polish.`;

export const FACE_BODY_PLAYBOOK = `FACE & FRAME PLAYBOOK: apply these mappings to what you observe; don't re-derive them
FACE SHAPE -> COLLAR / LAPEL / FRAMES
- Round: point or medium-spread collars add angles; avoid small rounded collars. Angular eyewear. Structured shoulders sharpen everything above the chest.
- Square: soft spread collars and gentle curves balance the jaw; rounded or softly-angular frames; notch lapels over sharp peaks.
- Oblong/long: wider spread collars and horizontal detail shorten the face; deeper (taller) eyeglass frames; avoid tall narrow point collars.
- Oval: nearly everything works, pick collar by formality, not correction.
- Heart (wide brow, narrow chin): medium spreads, scarves/textured knits add lower-half weight; frames with detail at the bottom edge.
- Diamond: medium spread + texture at the neckline; frames with defined browlines.
- Beard/hair interplay: a full beard mimics a wider jaw (treat as squarer); a high fade/volume up top lengthens (treat as longer).
BODY TYPE -> SILHOUETTE
- Athletic V (broad shoulder, trim waist): tailored fits with real waist suppression; stretch or high-twist fabrics for the reach; avoid boxy cuts that waste the shape and skin-tight ones that shout.
- Slim/straight: layering and texture create structure; slim-not-skinny cuts; spread collars and horizontal elements add width up top.
- Broader through the middle: structured (not padded-boxy) shoulders, clean vertical lines, flat-front trousers with a gentle taper, jackets fastening at the natural waist; avoid clingy knits and strong horizontal stripes.
- Tall and narrow: breaks, cuffs, layers, and texture add visual mass; contrast between top and bottom shortens agreeably; avoid one unbroken skinny column.
- Compact/shorter: monochromatic or low-contrast columns lengthen; slightly shorter jacket length, higher trouser rise, minimal break; avoid long jackets and heavy horizontal color blocking.
UNIVERSAL PROPORTION CHECKS: jacket shoulder seam ends AT the shoulder (the one thing no tailor fixes); jacket roughly covers the seat; 1/4-1/2 inch of shirt cuff shows; trouser break slight-to-none in a modern cut.`;

export const PRICE_AND_TIMING_REALITY = `HOUSTON PRICE & TIMING REALITY: ballparks to plan with (say "typically/roughly"; never present as quotes)
WHAT THINGS RUN (typical, Houston):
- Off-the-rack modern suiting (Suitsupply tier): roughly $500-800 a suit; sport coats $400-600.
- Entry made-to-measure (Indochino tier): suits from roughly $400-650. Mid MTM (Q Clothier / Lucho / Kuffs / Bill Walker): roughly $800-1,500. Luxury OTR (Zegna): several thousand; Brioni: the top of the market.
- Dress shirts: good OTR $60-150; custom/paper-pattern typically $185-350 each.
- Trousers: $80-200 OTR wear-to-work; denim $100-250 at the boutiques.
- Shoes: Johnston & Murphy $150-250; Allen Edmonds $300-450 (recraftable, decade math); Tecovas boots $250-350; Lucchese $600-2,000+; Republic Boot custom from about $1,800.
- Alterations (Houston independents like QC Tailors): hems ~$15-25, trouser taper ~$20-40, jacket sleeves ~$30-50, waist ~$20-35, shirt darts ~$15-25. Always reserve an alterations line, roughly 8-12% of a rebuild budget.
LEAD TIMES (order backward from the deadline):
- Indochino MTM: about 3 weeks. Q Clothier: about 6. Most MTM suiting: 3-6 weeks, plus a fitting.
- Custom shirts: first order a few weeks (pattern-making); reorders faster.
- Custom boots or hats: weeks to months, order well before rodeo season.
- In-house alterations at Suitsupply/Nordstrom: often same-visit to ~1 week; independents ~3-10 business days.
WHEN TO BUY: January and July-August markdowns for tailoring and next-season pieces (Nordstrom's Anniversary Sale typically mid-July into August); overcoats and formalwear in October before gala season; western ahead of February; conference suiting 6+ weeks before CERAWeek/OTC.${
  PRICE_BRIEF
    ? `
LIVE PRICE NOTES (researched ${PRICE_BRIEF_DATE}, current ground truth over the generic ballparks above):
${PRICE_BRIEF}`
    : ""
}`;

export const KYLA_STYLE_GEMS = `STYLE GEMS: real menswear knowledge, one line each
- High-twist wool shrugs off wrinkles, the car-to-meeting fabric.
- A tailor can always take in; letting out needs seam allowance, buy for the biggest part of you.
- The shoulder seam is the one thing no tailor can fix; everything else is $20-50.
- Non-iron shirts trade a little breathability for convenience, a fair trade in AC'd Houston.
- Half-lined jackets wear about ten degrees cooler than fully lined ones.
- Dark denim gets into nice restaurants; black jeans argue at the door.
- A suit worn twice a week dies in a year, rotation doubles a suit's life.
- One $350 recraftable shoe beats three $120 pairs across a decade.
- Merino doesn't hold smell the way cotton does, travel and long-day gold.
- A gap between collar and jacket means wrong size, walk away, don't alter.
- Belt leather matches shoe leather; the watch strap gets a pass.
- Alterations are ~10% of a rebuild budget and matter more than any single garment.
- Clean boots with a suit works in Houston in a way it works almost nowhere else.
- Modern trouser break: slight or none, puddling ankles age every outfit.
- Houston offices run 66°F in August; the blazer is survival gear, not decoration.
- If you're tugging at it in the fitting room, you'll be tugging at it in the meeting, put it back.
- A light-gray v-neck undershirt disappears under a white shirt; white ones show through. Houston sweat rule.
- Never debut anything new on the big day, the proven outfit that's already been to the tailor wins.
- When an outfit works, take the mirror photo. Six good photos is a personal lookbook no stylist can beat.
- Cedar shoe trees the same night doubles a dress shoe's life, sweat is the killer, not miles.
- Wash jeans and blazers less, hang them more, half of "worn out" is just over-laundered.
- One white oxford button-down goes with a suit, denim, and everything between, the hardest-working $100 in menswear.
- Steam beats ironing for suits and knits, a $30 steamer saves hundreds in pressing.`;

export const KYLA_LIFE_MOMENTS = `LIFE MOMENTS PLAYBOOK: when a man brings one of these through the door, this is your stance and the one tip that helps him TODAY
- JOB INTERVIEW THIS WEEK: no new purchases, no experiments, his best proven outfit, pressed, plus a $25 same-week tailor hem/taper if something's close. Confidence comes from the third-best outfit he trusts, not the best one he doesn't.
- NEW JOB STARTING: dress for the job on day one, observe for two weeks, THEN buy, every office has an unwritten code you can't read from outside. Plan covers the observed reality, not the offer letter.
- HIS OWN WEDDING: he outdresses everyone, and it's ordered 8+ weeks out, this is the one day rental math loses to buying something that fits him perfectly.
- WEDDING GUEST: never outdress the groom, never wear the bridesmaids' color, and a navy suit with a knit tie survives every Houston wedding from a ranch to the Corinthian.
- FUNERAL: this one is service, not style, dark suit, white shirt, quiet tie, polished shoes, zero conversation pieces. Handle it gently and fast, no jokes anywhere near it.
- FIRST DATE (especially post-breakup): the goal is "most comfortable version of his best self," not a costume, best-fitting dark jeans, one elevated piece up top, shoes that prove effort. Nerves read louder than clothes; fit kills nerves.
- BIG PRESENTATION / PROMOTION CASE: dress one clean notch above his daily uniform, nothing new or fussy, he needs zero wardrobe thoughts while he performs.
- MEETING HER PARENTS: tucked-in collared shirt, real shoes, one degree more formal than told, mothers clock shoes and ironing, fathers clock the handshake, nobody clocks the brand.`;
