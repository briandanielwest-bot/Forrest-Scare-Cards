import type Anthropic from "@anthropic-ai/sdk";
import { recordUsage } from "../costs";
import { HUMAN_VOICE_RULES, sanitizeVoice } from "./voice";
import { anthropic, type WithEffort } from "../anthropicClient";
import { FAST_AGENT_MODEL } from "../config";
import { coerceArray } from "./toolInput";
import { FACE_BODY_PLAYBOOK } from "../data/houstonKnowledge";
import type { PhotoAssessment, StyleProfile, UploadedImage } from "../types";

/**
 * "Theo" — Photo Analyst Agent. An offensive lineman until his knee went,
 * legend famous for reading the play before it happens.
 *
 * Looks at as many photos of the man as he'll upload (current outfits,
 * candid full-body shots, whatever he has) and works out what his look
 * currently is, what's working, what isn't, his coloring, his face shape
 * and body type, and what silhouettes/fits would serve him — merged later
 * with his stated style profile by the Wardrobe Planner.
 */

const SYSTEM_PROMPT = `You are Theo, the photo analysis agent inside the Bayou & Blazer men's style app. You are given one or more photos of a man, could be current outfits, candid full-body shots, mirror selfies, whatever he uploaded. Analyze ALL of them together as evidence of the same person, not one at a time in isolation.

Be direct, specific, and constructive, never insulting, never generic. "Your shoulders run narrow for that boxy jacket" is useful; "you could look better" is not. Assume he wants the truth because he wants to look sharp, not a compliment.

Cover:
- What his current style actually communicates right now (even if the answer is "not much of a coherent style yet").
- Concrete strengths already working for him, build on these, don't ignore them.
- Concrete gaps or fit issues you can see (proportions, fit, color, dated pieces, mismatched formality, etc.).
- Best-guess skin undertone (warm/cool/neutral) from the photos and which colors will flatter him vs. wash him out.
- FACE SHAPE, when a photo shows his face clearly enough: best-guess shape (oval, round, square, oblong, heart, diamond) and, more importantly, what follows from it for clothing choices: which collar styles and spread widths frame his face best, lapel width, crew vs. V necklines, scarf/tie knot size, and (if visible) how his hairstyle, facial hair, or glasses interact with collars and necklines. Face-driven picks are among the most underused levers in menswear, be concrete.
- BODY TYPE as a short plain-language read (e.g. "athletic V-shape", "slim/straight", "broad through the middle", "tall and narrow", "compact and powerful") alongside the finer proportion notes (shoulder width, torso-to-leg ratio, neck length, etc.), stated matter-of-factly and usefully, never as criticism of his body itself. The goal is fit guidance, not body commentary: every body type has a best version, your job is to name the cuts that get him there.
- Recommended silhouettes/cuts that would work well for his frame.

If the photos are too few, too dark, too distant, or don't show his face or enough of his body to say something concrete, say so honestly in the relevant fields ("face not clearly visible in these photos") rather than inventing detail.

${HUMAN_VOICE_RULES}

${FACE_BODY_PLAYBOOK}

Observe first, then apply the playbook mappings above to fill faceGuidance and fitGuidance, your job is accurate observation plus correct application, not re-deriving menswear theory.

Call submit_assessment exactly once with your full analysis.`;

const SUBMIT_ASSESSMENT_TOOL: Anthropic.Tool = {
  name: "submit_assessment",
  description: "Submit the complete photo-based style assessment.",
  input_schema: {
    type: "object",
    properties: {
      currentStyleSummary: { type: "string" },
      strengths: { type: "array", items: { type: "string" } },
      gapsOrIssues: { type: "array", items: { type: "string" } },
      skinUndertone: { type: "string", description: "e.g. warm, cool, neutral, or 'unclear from photos'" },
      bestColors: { type: "array", items: { type: "string" } },
      colorsToAvoidFromPhotos: { type: "array", items: { type: "string" } },
      faceShape: {
        type: "string",
        description: "Best-guess face shape (oval/round/square/oblong/heart/diamond), or 'face not clearly visible in these photos'.",
      },
      faceGuidance: {
        type: "array",
        items: { type: "string" },
        description: "Concrete face-driven picks: collar styles and spreads, lapel width, necklines, tie knot size, glasses/hair/beard interactions.",
      },
      bodyType: {
        type: "string",
        description: "Short plain-language body-type read, e.g. 'athletic V-shape', 'slim/straight', 'broad through the middle'.",
      },
      bodyProportionNotes: { type: "string" },
      recommendedSilhouettes: { type: "array", items: { type: "string" } },
      fitGuidance: { type: "array", items: { type: "string" } },
    },
    required: [
      "currentStyleSummary",
      "strengths",
      "gapsOrIssues",
      "skinUndertone",
      "bestColors",
      "faceShape",
      "faceGuidance",
      "bodyType",
      "recommendedSilhouettes",
      "fitGuidance",
    ],
  },
};

export async function analyzePhotos(
  images: UploadedImage[],
  styleProfile?: StyleProfile,
): Promise<PhotoAssessment> {
  if (images.length === 0) {
    throw new Error("analyzePhotos requires at least one image");
  }

  const contextLine = styleProfile
    ? `For context, he described his style goal as: ${styleProfile.styleArchetypes.join(", ")}. Fit preference: ${styleProfile.fitPreferences}.`
    : "No style profile has been collected yet, analyze on visuals alone.";

  const content: Anthropic.ContentBlockParam[] = [
    ...images.map(
      (img): Anthropic.ContentBlockParam => ({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.base64Data },
      }),
    ),
    {
      type: "text",
      text: `Here are ${images.length} photo(s) of the same man. ${contextLine} Analyze them and call submit_assessment.`,
    },
  ];

  const params: WithEffort<Anthropic.MessageCreateParamsNonStreaming> = {
    model: FAST_AGENT_MODEL,
    max_tokens: 4096,
    system: [{ type: "text" as const, text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" as const } }],
    messages: [{ role: "user", content }],
    tools: [SUBMIT_ASSESSMENT_TOOL],
    tool_choice: { type: "tool", name: "submit_assessment" },
    output_config: { effort: "medium" },
  };
  const response = await anthropic.messages.create(params);
  recordUsage("photoAnalyst", FAST_AGENT_MODEL, response.usage);

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "submit_assessment",
  );
  if (!toolUse) {
    throw new Error("Photo analyst did not return an assessment");
  }

  const input = sanitizeVoice(toolUse.input) as Record<string, unknown>;
  return {
    numPhotosAnalyzed: images.length,
    currentStyleSummary: String(input.currentStyleSummary ?? ""),
    strengths: coerceArray<string>(input.strengths),
    gapsOrIssues: coerceArray<string>(input.gapsOrIssues),
    skinUndertone: String(input.skinUndertone ?? ""),
    bestColors: coerceArray<string>(input.bestColors),
    colorsToAvoidFromPhotos: coerceArray<string>(input.colorsToAvoidFromPhotos),
    faceShape: String(input.faceShape ?? ""),
    faceGuidance: coerceArray<string>(input.faceGuidance),
    bodyType: String(input.bodyType ?? ""),
    bodyProportionNotes: String(input.bodyProportionNotes ?? ""),
    recommendedSilhouettes: coerceArray<string>(input.recommendedSilhouettes),
    fitGuidance: coerceArray<string>(input.fitGuidance),
  };
}
