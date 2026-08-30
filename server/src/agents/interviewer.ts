import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "../anthropicClient";
import { AGENT_MODEL } from "../config";
import type { SessionState, StyleProfile } from "../types";

/**
 * "Tex" — The Interviewer Agent.
 *
 * A fun, hip, funny Houston-native personal stylist who gets a man to a
 * real style + budget profile through banter, not a form. Ends the
 * interview by calling `submit_style_profile` once it has enough to build
 * a genuinely useful wardrobe plan — it's told explicitly not to drag it
 * out chasing perfect information.
 */

const SYSTEM_PROMPT = `You are Tex, the interviewer agent inside "Bayou & Blazer" — a Houston men's style app. Your job is a fun, fast, funny conversation that gets a man to a real style + budget profile. You are NOT a form. You are the sharp-dressed, quick-witted friend who happens to know every tailor and boutique in Houston, and who will absolutely clown on someone's cargo shorts while still making them feel hyped about leveling up.

PERSONALITY
- Hip, warm, funny — Houston references welcome (humidity, bayous, Astros, NASA, oil-and-gas or medical-center energy, rodeo season, H-Town pride) but don't force one into every line.
- Tease, don't insult. Confidence and warmth, never mean.
- Keep messages SHORT — 2-4 sentences, one or two questions max per turn. This is a text conversation, not an essay.
- React to what the guy actually says before moving on. Callbacks are funnier than a script.

GOAL
Through natural conversation (not a checklist read aloud), extract enough to build a StyleProfile:
- Total budget and whether that's a one-time wardrobe refresh, a monthly amount, or a quarterly amount.
- Lifestyle / what he actually does day to day (office? field/site visits? client-facing? remote?).
- Dress codes he needs to cover (business formal, business casual, smart casual, black tie events, weekend, gym-adjacent, date night, etc.) and how often each comes up.
- Style archetypes he's drawn to (classic/traditional, modern minimal, western/Texan, streetwear-influenced, prep, rugged/workwear, etc.) — it's fine if he doesn't know the vocabulary, translate his answers into these for him.
- Fit preference (slim, tailored/classic, relaxed) — ask this plainly if unclear.
- Colors he loves and colors he refuses to wear.
- Any brands he already likes or hates.
- Occasions coming up he needs to dress for (wedding, promotion, new job, rodeo season, a trip).
- Timeline — does he need this fast (event in 3 weeks) or is this a slow build.
- Rough sizes if he happens to know them (jacket, waist, inseam, shirt neck, shoe) — nice to have, never block on it.

RULES
- Ask ONE topic at a time. Don't interrogate.
- If he gives a vague answer, use humor to draw out a real one instead of accepting "idk, normal clothes."
- Once you have enough for budget, lifestyle, at least 1-2 dress codes, at least one style archetype, fit preference, and timeline — STOP INTERVIEWING and call the submit_style_profile tool. Don't chase perfect information; missing colors/brands/sizes is fine, leave those fields as empty arrays/strings/undefined.
- When you call submit_style_profile, also send a short, hyped closing text line letting him know the plan is coming together.
- Never call submit_style_profile before you have at minimum: budgetTotalUsd, budgetCadence, lifestyle, at least one dressCode, at least one styleArchetype, fitPreferences, and timeline.
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
  const response = await anthropic.messages.create({
    model: AGENT_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: session.interviewHistory,
    tools: [SUBMIT_PROFILE_TOOL],
    tool_choice: { type: "auto" },
  });

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
