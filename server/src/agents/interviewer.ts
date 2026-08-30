import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, type WithEffort } from "../anthropicClient";
import { AGENT_MODEL } from "../config";
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

GOAL — go deep, not just wide
Through natural conversation, extract enough to build a genuinely specific StyleProfile. Don't settle for the first thing he says on any of these — ask a real follow-up on at least the style/archetype and current-pain-points questions before moving on:
- Total budget and whether that's a one-time wardrobe rebuild, a monthly amount, or a quarterly amount.
- Lifestyle / what he actually does day to day (office? field/site visits? client-facing? remote? which industry — that changes everything in this city).
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
- Once you have real, specific coverage of budget, lifestyle, at least 2 dress codes, at least one well-defined style archetype (with a follow-up behind it, not just his first guess), fit preference, colors, and timeline — STOP INTERVIEWING and call the submit_style_profile tool. Missing brands/sizes is fine, leave those fields as empty arrays/strings/undefined — but don't skip the follow-up depth on style itself just to wrap up faster.
- When you call submit_style_profile, also send a short, hyped closing text line that names the real scale of what's coming — dollar amounts, a timeline, real Houston stores — not just "let's build your plan."
- Never call submit_style_profile before you have at minimum: budgetTotalUsd, budgetCadence, lifestyle, at least two dressCodes, at least one styleArchetype, fitPreferences, colorPreferences, and timeline.
- All monetary amounts are USD.`;

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
}

async function runTurn(session: SessionState): Promise<InterviewTurnResult> {
  const params: WithEffort<Anthropic.MessageCreateParamsNonStreaming> = {
    model: AGENT_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: session.interviewHistory,
    tools: [SUBMIT_PROFILE_TOOL],
    tool_choice: { type: "auto" },
    // This is a live chat turn — a man is waiting on the other end for
    // Kyla's reply, so it needs to come back quickly, not exhaustively.
    output_config: { effort: "medium" },
  };
  const response = await anthropic.messages.create(params);

  session.interviewHistory.push({ role: "assistant", content: response.content });

  let reply = "";
  let profile: StyleProfile | undefined;

  for (const block of response.content) {
    if (block.type === "text") {
      reply += (reply ? "\n" : "") + block.text;
    } else if (block.type === "tool_use" && block.name === "submit_style_profile") {
      const input = block.input as Record<string, unknown>;
      profile = {
        firstName: typeof input.firstName === "string" ? input.firstName : undefined,
        budgetTotalUsd: Number(input.budgetTotalUsd) || 0,
        budgetCadence: (input.budgetCadence as StyleProfile["budgetCadence"]) ?? "one-time",
        lifestyle: String(input.lifestyle ?? ""),
        dressCodes: Array.isArray(input.dressCodes) ? (input.dressCodes as string[]) : [],
        styleArchetypes: Array.isArray(input.styleArchetypes) ? (input.styleArchetypes as string[]) : [],
        fitPreferences: String(input.fitPreferences ?? ""),
        colorPreferences: Array.isArray(input.colorPreferences) ? (input.colorPreferences as string[]) : [],
        colorsToAvoid: Array.isArray(input.colorsToAvoid) ? (input.colorsToAvoid as string[]) : [],
        brandAffinities: Array.isArray(input.brandAffinities) ? (input.brandAffinities as string[]) : [],
        occasionsToPlanFor: Array.isArray(input.occasionsToPlanFor) ? (input.occasionsToPlanFor as string[]) : [],
        timeline: String(input.timeline ?? ""),
        sizes: (input.sizes as StyleProfile["sizes"]) ?? undefined,
        notes: String(input.notes ?? ""),
      };

      // The tool call needs a tool_result to keep the transcript valid, even
      // though we won't send another request in this turn.
      session.interviewHistory.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: block.id,
            content: "Profile received. Interview complete.",
          },
        ],
      });
    }
  }

  if (!reply) {
    reply = profile
      ? "Alright, I've got what I need — let's build your plan!"
      : "Tell me more?";
  }

  return { reply, done: Boolean(profile), profile };
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
