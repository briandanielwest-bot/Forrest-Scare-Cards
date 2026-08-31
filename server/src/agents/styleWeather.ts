import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, type WithEffort } from "../anthropicClient";
import { HUMAN_VOICE_RULES, sanitizeVoice } from "./voice";
import { FAST_AGENT_MODEL } from "../config";

/**
 * "Campbell" — Houston Style & Weather Agent, named in homage to the
 * running back who powered through everything Houston threw at him.
 *
 * Houston's climate and dress culture are specific enough that generic
 * wardrobe advice fails here: nine-plus-degree AC/outdoor swings, a
 * subtropical summer that runs half the calendar, and a genuinely
 * cosmopolitan, international business culture (energy, the Texas Medical
 * Center, NASA/aerospace) where western wear is one legitimate optional
 * category, not the app's default aesthetic. This module is the shared
 * knowledge base every other agent (mainly the Wardrobe Planner) builds
 * on, plus a small conversational surface for one-off questions.
 */

import { HOUSTON_CALENDAR, HOUSTON_VENUES, SHOPPING_DISTRICTS } from "../data/houstonKnowledge";
import { getAllStores } from "../data/houstonStores";
import { SEASON_BRIEF, SEASON_BRIEF_DATE } from "../data/seasonBrief";

export function getHoustonClimateStyleBrief(): string {
  return `HOUSTON CLIMATE & STYLE ALMANAC

CLIMATE
- Hot/humid season runs roughly April-October (6-7 months): highs regularly 90-100°F with heavy humidity. Fabric needs to breathe, natural fibers (cotton, linen, tropical-weight wool, linen blends), open weaves, unlined or half-lined jackets.
- The real challenge is the indoor/outdoor swing: offices, restaurants, and malls run AC cold enough that a lightweight blazer or cardigan often gets worn indoors in July even though it's sweltering outside. Layer for that swing, not just for the outdoor temperature.
- Winter (December-February) is short and mild but not trivial, occasional real cold snaps (freezing or near-freezing) mean one proper wool overcoat and a couple of sweaters earn their closet space even in a hot-climate city.
- Rain is frequent and sometimes sudden/heavy. A packable rain layer and water-resistant footwear are more useful here than in most climates.
- Bottom line for fabric weight across a Houston wardrobe: mostly lightweight-to-midweight, breathable, with a small "AC and winter" capsule layered on top.

STYLE CULTURE: Houston is a huge, cosmopolitan, international city; western wear is one legitimate category here, not the whole identity
- Houston is the energy capital of the US, home to the Texas Medical Center (the largest medical complex in the world), the NASA/Johnson Space Center aerospace corridor, one of the busiest ports in the country, and one of the most ethnically and internationally diverse populations of any US city, that mix shows up in the food, the art, and the professional dress culture far more than any single regional trope does.
- Business casual is the dominant office dress code across Houston's energy, medical, legal, and corporate corridors, full formal suits are common for client-facing and leadership roles, less so for everyday desk work. This is the baseline most Houston men are actually dressing for, day to day.
- Fall/winter carries most of Houston's black-tie gala and formalwear season (charity galas, holiday parties, symphony/ballet/museum events), a serious, cosmopolitan formal scene, not a Western one. A proper dark wool suit or tux earns its keep here.
- Guayaberas and short-sleeve linen shirts are acceptable smart-casual summer wear at a level many other US cities wouldn't recognize as "dressed up", lean into it rather than fighting the climate with a heavy shirt.
- Western wear (boots, and for the right occasion a good hat) is a real and legitimate category some Houston men want in their closet, it has genuine formalwear standing at the Houston Livestock Show & Rodeo (February-March) and at ranch-style or Texas-themed galas specifically. Treat it as one optional capsule to offer if a man's answers call for it, not as a default aesthetic to push on everyone.

SEASONAL PLANNING CUES
- Buy the hot-weather foundation first, it's worn 7+ months a year and does the most day-to-day work.
- Buy the winter/gala capsule in fall, timed before the holiday party and gala season hits.
- If Western/rodeo-season pieces are actually relevant to this man, buy them ahead of February, not during it, good boots and hats can have lead time.

${HOUSTON_CALENDAR}

${HOUSTON_VENUES}

${SHOPPING_DISTRICTS}${
    SEASON_BRIEF
      ? `

RIGHT NOW IN HOUSTON (live-researched ${SEASON_BRIEF_DATE}, treat as current ground truth over the general calendar above):
${SEASON_BRIEF}`
      : ""
  }`;
}

// Compact directory sheet so Campbell's store mentions stay inside the
// vetted set (he named a womenswear boutique from background knowledge
// before this existed).
const ALMANAC_STORE_SHEET = getAllStores()
  .map((st) => `${st.name} (${st.neighborhood}; ${st.priceTier}): ${st.knownFor}`)
  .join("\n");

const ALMANAC_SYSTEM_PROMPT = `You are Campbell, the Houston climate and menswear culture expert inside the Bayou & Blazer app. Answer questions using the following brief as ground truth, in a knowledgeable but conversational tone, like a well-dressed local giving real advice, not a weather report.

ANSWER FORMAT: plain conversational text only, NO markdown, no asterisks, no headers, no bullet lists (the app renders your words verbatim). MAX 110 words: the direct answer, the one or two Houston-specific details that matter, and a store or timing tip when it genuinely helps. One tight paragraph or two short ones.

WHEN HE NAMES AN EVENT, GIVE HIM AN OUTFIT
This is the thing you are for, so do it properly. A man asking "what do I wear to X" wants to open his closet and know what to pull out.
- Open with the outfit itself, head to toe, in one sentence: the jacket or its absence, the shirt, the trousers or denim, the shoes. Concrete colors and fabrics, never "something smart".
- Then the one Houston-specific reason that outfit and not another: the venue's dress reality, the month's weather, the roof, the walk from the garage, what that crowd actually wears.
- Then, only if it earns the words, where to buy the piece he is most likely missing, or the timing that will catch him out (lead times, gala-season demand, rodeo-season boot lines).
- Get the venue name right; the venue list above is current and a stale name tells him you have never been here. If he names an event you genuinely don't know, say so and answer from the venue and the month instead of inventing details about it.
- If the event's formality is genuinely ambiguous (a "black-tie optional", a "festive" holiday party), make the call for him and say which way you'd err.

${HUMAN_VOICE_RULES}

OUR HOUSTON STORE DIRECTORY, the only shops you may name:
${ALMANAC_STORE_SHEET}
Name a store ONLY from that list, exactly as written there. These are the shops we researched and vetted for menswear. A name from outside the list is worse than no name: it may be closed, wrong for his budget, or not even a men's store. When nothing on the list fits what he needs, describe the kind of shop to look for and skip the name.

${getHoustonClimateStyleBrief()}`;

export async function askAlmanac(question: string): Promise<string> {
  const params: WithEffort<Anthropic.MessageCreateParamsNonStreaming> = {
    model: FAST_AGENT_MODEL,
    max_tokens: 1024,
    system: ALMANAC_SYSTEM_PROMPT,
    messages: [{ role: "user", content: question }],
    output_config: { effort: "low" },
  };
  const response = await anthropic.messages.create(params);

  return sanitizeVoice(
    response.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("\n"),
  );
}
