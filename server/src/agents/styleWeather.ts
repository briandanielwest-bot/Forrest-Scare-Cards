import { anthropic } from "../anthropicClient";
import { AGENT_MODEL } from "../config";

/**
 * "The Almanac" — Houston Style & Weather Agent.
 *
 * Houston's climate and dress culture are specific enough that generic
 * wardrobe advice fails here: nine-plus-degree AC/outdoor swings, a
 * subtropical summer that runs half the calendar, and a business culture
 * where Western wear is formalwear a few weeks a year. This module is the
 * shared knowledge base every other agent (mainly the Wardrobe Planner)
 * builds on, plus a small conversational surface for one-off questions.
 */

export function getHoustonClimateStyleBrief(): string {
  return `HOUSTON CLIMATE & STYLE ALMANAC

CLIMATE
- Hot/humid season runs roughly April-October (6-7 months): highs regularly 90-100°F with heavy humidity. Fabric needs to breathe — natural fibers (cotton, linen, tropical-weight wool, linen blends), open weaves, unlined or half-lined jackets.
- The real challenge is the indoor/outdoor swing: offices, restaurants, and malls run AC cold enough that a lightweight blazer or cardigan often gets worn indoors in July even though it's sweltering outside. Layer for that swing, not just for the outdoor temperature.
- Winter (December-February) is short and mild but not trivial — occasional real cold snaps (freezing or near-freezing) mean one proper wool overcoat and a couple of sweaters earn their closet space even in a hot-climate city.
- Rain is frequent and sometimes sudden/heavy. A packable rain layer and water-resistant footwear are more useful here than in most climates.
- Bottom line for fabric weight across a Houston wardrobe: mostly lightweight-to-midweight, breathable, with a small "AC and winter" capsule layered on top.

STYLE CULTURE
- Business casual is the dominant office dress code across Houston's energy, medical (Texas Medical Center), legal, and corporate corridors — full formal suits are common for client-facing and leadership roles, less so for everyday desk work.
- Western wear is not costume here — boots, and for the right occasion a good Stetson, read as legitimate formalwear, especially February-March during the Houston Livestock Show & Rodeo, at ranch/vineyard events, and at plenty of black-tie-adjacent galas with a Texas twist.
- Guayaberas and short-sleeve linen shirts are acceptable smart-casual summer wear at a level many other US cities wouldn't recognize as "dressed up" — lean into it rather than fighting the climate with a heavy shirt.
- Fall/winter carries most of Houston's black-tie gala and formalwear season (charity galas, holiday parties, symphony/ballet events) — this is where a proper dark wool suit or tux gets its use.
- Denim and boots are everyday-acceptable in most non-corporate settings, including a lot of "smart casual" dinners.

SEASONAL PLANNING CUES
- Buy the hot-weather foundation first — it's worn 7+ months a year and does the most day-to-day work.
- Buy Western/rodeo-season pieces ahead of February if that's a relevant occasion, not during it — good boots and hats can have lead time.
- Buy the winter/gala capsule in fall, timed before the holiday party and gala season hits.`;
}

const ALMANAC_SYSTEM_PROMPT = `You are "The Almanac," the Houston climate and menswear culture expert inside the Bayou & Blazer app. Answer questions using the following brief as ground truth, in a knowledgeable but conversational tone — like a well-dressed local giving real advice, not a weather report.

${getHoustonClimateStyleBrief()}`;

export async function askAlmanac(question: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: AGENT_MODEL,
    max_tokens: 1024,
    system: ALMANAC_SYSTEM_PROMPT,
    messages: [{ role: "user", content: question }],
  });

  return response.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
