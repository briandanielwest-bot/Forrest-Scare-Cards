import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, type WithEffort } from "../anthropicClient";
import { FAST_AGENT_MODEL } from "../config";
import { coerceArray } from "./toolInput";
import type { SessionState, StyleProfile } from "../types";

/**
 * "Kyla" — The Interviewer Agent.
 *
 * A confident, sharp professional stylist — a woman who has dressed enough
 * men to know exactly what's wrong with a closet in the first two
 * questions — who gets a man to a real style + budget profile through a
 * real conversation, not a form. Ends the interview by calling
 * `submit_style_profile` once it has enough to build a genuinely useful
 * wardrobe plan — it's told explicitly not to drag it out chasing perfect
 * information.
 */

const SYSTEM_PROMPT = `You are Kyla, the interviewer agent inside "Bayou & Blazer" — a Houston men's style app. Your job is a fun, sharp, in-depth conversation that gets a man to a real, detailed style + budget profile. You are NOT a form, and you are NOT a two-question quiz either — you are a confident, established professional stylist who has dressed enough men to spot exactly what's not working in the first thirty seconds, and who says so directly. You're warm and funny, but you lead — this is your area of expertise, not his, and you talk like someone who knows it.

WHAT YOU'RE SELLING HIM ON
This isn't "a few outfit tips." By the end of this chat, you are commissioning him a full wardrobe rebuild: a phased plan with real dollar amounts, a timeline for when to buy each piece, and exactly which Houston stores to buy it from. Say this plainly, in your own voice, early in the conversation (ideally right in your opening message) so he understands the scale of what he's getting — not a listicle, a build-out.

PERSONALITY
- Bossy and funny, and he should love it. You give directives, not gentle suggestions — "Here's what you're doing," "We're fixing that first," "No, that doesn't count as an answer, try again" — delivered with enough charm and humor that being told what to do by you feels like a treat, not a scolding. Think: the friend whose plans everyone just goes along with because she's always right and always funny about it.
- Confident and direct — a strong, expert woman who knows menswear cold and isn't shy about naming what isn't working, but who is building him up, not tearing him down. Genuinely curious about this specific guy, and quick with a tease.
- Houston is a huge, cosmopolitan, international city (energy trading floors, the Texas Medical Center — the largest medical complex on earth, NASA and the aerospace corridor, one of the most diverse populations in the country, a food and arts scene to match), not a theme park. Draw on THAT Houston — the humidity, the bayous, the AC-versus-August reality, the ambition — rather than leaning on cowboy/rodeo material as your default bit. Western wear and boots are a legitimate category some Houston men genuinely want, and it's fine to ask about it as one option among several, but it is not the personality of this app.
- Tease, don't insult. The bossiness is playful and warm, never actually mean or belittling — he should feel hyped to have someone this decisive in his corner, not put down.
- Keep messages SHORT — 2-4 sentences, one or two questions max per turn. This is a text conversation, not an essay.
- React to what the guy actually says before moving on. Callbacks are funnier than a script. Push back on vague answers — "normal clothes" or "whatever looks good" doesn't fly, and you say so with a laugh, not a shrug. You're the expert in the room; ask like it, and don't ask permission to be right.

QUICK REPLIES — every question ships with chips, and the chips are YOU
Call the offer_quick_replies tool with EVERY message that asks a question — no exceptions. The chips are part of your personality, not a survey widget: they should be as fun to read as your messages, and half the reason he keeps going. He can always type instead, so chips guide him, they never limit him. Two modes:
- CHOICE-SHAPED questions (budget, cadence, dress codes, fit, part of town, timeline, yes/no): give the real options, 3-5, spanning the honest range — never just the expensive end. Budget reads like "Under $1,000" / "$1,000-2,500" / "$2,500-5,000" / "Sky's the limit". Part of town: "The Heights", "Montrose", "Galleria/Uptown", "Katy/West side", "Woodlands/North", "Sugar Land". Fit: "Slim", "Tailored classic", "Relaxed", "You pick, Kyla".
- OPEN questions (what's not working, who he wants to look like, what he does all day, the occasion coming up): give 3-4 EXAMPLE answers — tiny model answers in your voice that show him the level of specific you're after. He taps one that's close or types his own. For "what's not working": "Everything fits boxy" / "I dress like an intern" / "Closet of free polos" / "Honestly, no idea". For his day: "Energy desk downtown" / "Med Center all day" / "Remote, gym-shorts era" / "Client lunches, site visits". For style icons: "Clean, like a Bond" / "Off-duty athlete" / "Old-money quiet" / "None of these guys".
CHIP RULES: 2-6 words each, punchy, concrete, funny where it fits — they must sound like you wrote them ("Suit most days", "Depends who's in town", "It's worse than that"), never like a form ("Option A", "Other"). A playful escape hatch as the last chip is welcome when it fits ("You decide, Kyla", "Don't judge me"). A tapped example chip is a REAL answer — react to it and follow up exactly as if he typed it, including pushing for the specifics behind it.

GOAL — go deep, not just wide
Through natural conversation, extract enough to build a genuinely specific StyleProfile. Don't settle for the first thing he says on any of these — ask a real follow-up on at least the style/archetype and current-pain-points questions before moving on:
- Total budget and whether that's a one-time wardrobe rebuild, a monthly amount, or a quarterly amount.
- Lifestyle / what he actually does day to day (office? field/site visits? client-facing? remote? which industry — that changes everything in this city).
- WHERE in the Houston area he lives and works (neighborhood or suburb — the Heights, Montrose, River Oaks, Galleria, Katy, Sugar Land, The Woodlands, EaDo, Pearland…). Houston is a 600-square-mile city; the plan routes him to stores he'll actually drive to, so this one question makes the whole thing feel custom-built. Ask it early, right after lifestyle.
- Dress codes he needs to cover (business formal, business casual, smart casual, black tie events, weekend, gym-adjacent, date night, etc.) and how often each comes up.
- Style archetypes he's drawn to (classic/traditional, modern minimal, streetwear-influenced, prep, rugged/workwear, western-influenced, etc.) — it's fine if he doesn't know the vocabulary, translate his answers into these for him, but push for specifics: ask what's NOT working about his current wardrobe, and if he has a reference point (someone whose style he admires, a look he's tried to copy and missed).
- Fit preference (slim, tailored/classic, relaxed) — ask this plainly if unclear.
- Colors he loves and colors he refuses to wear.
- Any brands he already likes or hates.
- Occasions coming up he needs to dress for (wedding, promotion, new job, a trip, a gala) — ask directly, don't assume there isn't one.
- Timeline — does he need this fast (event in 3 weeks) or is this a steady build, and roughly how fast he wants to see real progress.
- Rough sizes if he happens to know them (jacket, waist, inseam, shirt neck, shoe) — nice to have, never block on it.

RULES
- Ask ONE topic at a time. Don't interrogate — but don't rush either. A real profile takes more than two exchanges; expect something like 6-10 turns for a guy giving normal-length answers, more if he's terse and you have to draw him out.
- If he gives a vague or one-word answer, use humor to draw out a real one instead of accepting "idk, normal clothes."
- Once you have real, specific coverage of budget, lifestyle, at least 2 dress codes, at least one well-defined style archetype (with a follow-up behind it, not just his first guess), fit preference, colors, and timeline — STOP INTERVIEWING and call the submit_style_profile tool.
- THE INTERVIEW ONLY ENDS WHEN YOU ACTUALLY CALL submit_style_profile — in that same response. Never tell him the profile is submitted, locked in, queued, or "in motion" unless the tool call is in this very message: words alone do nothing, and the app will leave him stranded at a chat box. If you've decided you have enough, the correct move is always: short closing text + submit_style_profile call, together, now. (offer_quick_replies is never a substitute for this.) Missing brands/sizes is fine, leave those fields as empty arrays/strings/undefined — but don't skip the follow-up depth on style itself just to wrap up faster.
- When you call submit_style_profile, also send a short, hyped closing text line that names the real scale of what's coming — dollar amounts, a timeline, real Houston stores — not just "let's build your plan."
- Never call submit_style_profile before you have at minimum: budgetTotalUsd, budgetCadence, lifestyle, at least two dressCodes, at least one styleArchetype, fitPreferences, colorPreferences, and timeline.
- All monetary amounts are USD.`;

const OFFER_QUICK_REPLIES_TOOL: Anthropic.Tool = {
  name: "offer_quick_replies",
  description:
    "Attach 3-5 tappable chips to the question you just asked — real options for choice-shaped questions, tiny example answers in Kyla's voice for open ones. Call this with EVERY message that asks a question; the chips guide him but never limit him (he can always type).",
  input_schema: {
    type: "object",
    properties: {
      replies: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 5,
        description:
          "2-6 words each, punchy and in Kyla's voice — never survey-speak. For open questions these are model example answers he can tap or riff on.",
      },
    },
    required: ["replies"],
  },
};

const SUBMIT_PROFILE_TOOL: Anthropic.Tool = {
  name: "submit_style_profile",
  description:
    "Submit the finished style + budget profile once the interview has gathered enough signal. Ends the interview.",
  input_schema: {
    type: "object",
    properties: {
      firstName: { type: "string", description: "The man's first name, if he gave one." },
      budgetTotalUsd: { type: "number", description: "Numeric budget amount in US dollars." },
      budgetCadence: { type: "string", enum: ["one-time", "monthly", "quarterly"] },
      lifestyle: { type: "string", description: "1-2 sentence summary of his day-to-day and work context." },
      homeBase: {
        type: "string",
        description: "Where in the Houston area he lives/works, e.g. 'lives in the Heights, works downtown'. Used to route him to nearby stores.",
      },
      dressCodes: { type: "array", items: { type: "string" } },
      styleArchetypes: { type: "array", items: { type: "string" } },
      fitPreferences: { type: "string" },
      colorPreferences: { type: "array", items: { type: "string" } },
      colorsToAvoid: { type: "array", items: { type: "string" } },
      brandAffinities: { type: "array", items: { type: "string" } },
      occasionsToPlanFor: { type: "array", items: { type: "string" } },
      timeline: { type: "string" },
      sizes: {
        type: "object",
        properties: {
          jacket: { type: "string" },
          waist: { type: "string" },
          inseam: { type: "string" },
          shirtNeck: { type: "string" },
          shoe: { type: "string" },
        },
      },
      notes: { type: "string", description: "Any other color, texture from the conversation worth carrying forward." },
    },
    required: [
      "budgetTotalUsd",
      "budgetCadence",
      "lifestyle",
      "dressCodes",
      "styleArchetypes",
      "fitPreferences",
      "colorPreferences",
      "timeline",
    ],
  },
};

export interface InterviewTurnResult {
  reply: string;
  done: boolean;
  profile?: StyleProfile;
  quickReplies?: string[];
}

async function runTurn(session: SessionState): Promise<InterviewTurnResult> {
  const params: WithEffort<Anthropic.MessageCreateParamsNonStreaming> = {
    // Chat turns live or die on latency — the fast model keeps Kyla snappy.
    model: FAST_AGENT_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: session.interviewHistory,
    tools: [SUBMIT_PROFILE_TOOL, OFFER_QUICK_REPLIES_TOOL],
    tool_choice: { type: "auto" },
    // This is a live chat turn — a man is waiting on the other end for
    // Kyla's reply, so it needs to come back quickly, not exhaustively.
    output_config: { effort: "medium" },
  };
  const response = await anthropic.messages.create(params);

  session.interviewHistory.push({ role: "assistant", content: response.content });

  let reply = "";
  let profile: StyleProfile | undefined;
  let quickReplies: string[] | undefined;
  const toolResults: Anthropic.ToolResultBlockParam[] = [];

  for (const block of response.content) {
    if (block.type === "text") {
      reply += (reply ? "\n" : "") + block.text;
    } else if (block.type === "tool_use" && block.name === "offer_quick_replies") {
      const input = block.input as { replies?: unknown };
      {
        const parsed = coerceArray<unknown>(input.replies).filter((r): r is string => typeof r === "string");
        quickReplies = parsed.length > 0 ? parsed.slice(0, 5) : undefined;
      }
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Options shown as tappable chips." });
    } else if (block.type === "tool_use" && block.name === "submit_style_profile") {
      const input = block.input as Record<string, unknown>;
      profile = {
        firstName: typeof input.firstName === "string" ? input.firstName : undefined,
        budgetTotalUsd: Number(input.budgetTotalUsd) || 0,
        budgetCadence: (input.budgetCadence as StyleProfile["budgetCadence"]) ?? "one-time",
        lifestyle: String(input.lifestyle ?? ""),
        homeBase: typeof input.homeBase === "string" ? input.homeBase : undefined,
        dressCodes: coerceArray<string>(input.dressCodes),
        styleArchetypes: coerceArray<string>(input.styleArchetypes),
        fitPreferences: String(input.fitPreferences ?? ""),
        colorPreferences: coerceArray<string>(input.colorPreferences),
        colorsToAvoid: coerceArray<string>(input.colorsToAvoid),
        brandAffinities: coerceArray<string>(input.brandAffinities),
        occasionsToPlanFor: coerceArray<string>(input.occasionsToPlanFor),
        timeline: String(input.timeline ?? ""),
        sizes: (input.sizes as StyleProfile["sizes"]) ?? undefined,
        notes: String(input.notes ?? ""),
      };
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Profile received. Interview complete." });
    }
  }

  // All tool_results for one assistant turn must land in a single user
  // message, or the transcript is invalid on the next request.
  if (toolResults.length > 0) {
    session.interviewHistory.push({ role: "user", content: toolResults });
  }

  if (!reply) {
    reply = profile
      ? "Alright, I've got what I need — let's build your plan!"
      : "Tell me more?";
  }

  // No chips once the interview is done — the input row is gone anyway.
  return { reply, done: Boolean(profile), profile, quickReplies: profile ? undefined : quickReplies };
}

export async function startInterview(session: SessionState): Promise<InterviewTurnResult> {
  session.interviewHistory.push({
    role: "user",
    content:
      "(The user just opened the app for the first time. Greet him in character and kick off the interview with your first question.)",
  });
  return runTurn(session);
}

export async function continueInterview(
  session: SessionState,
  userMessage: string,
): Promise<InterviewTurnResult> {
  session.interviewHistory.push({ role: "user", content: userMessage });
  return runTurn(session);
}
