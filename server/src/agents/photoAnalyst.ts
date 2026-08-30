import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, type WithEffort } from "../anthropicClient";
import { AGENT_MODEL } from "../config";
import type { PhotoAssessment, StyleProfile, UploadedImage } from "../types";

/**
 * "Watt" — Photo Analyst Agent, named in homage to a Houston football
 * legend famous for reading the play before it happens.
 *
 * Looks at as many photos of the man as he'll upload (current outfits,
 * candid full-body shots, whatever he has) and works out what his look
 * currently is, what's working, what isn't, his coloring, his face shape
 * and body type, and what silhouettes/fits would serve him — merged later
 * with his stated style profile by the Wardrobe Planner.
 */

const SYSTEM_PROMPT = `You are Watt, the photo analysis agent inside the Bayou & Blazer men's style app. You are given one or more photos of a man — could be current outfits, candid full-body shots, mirror selfies, whatever he uploaded. Analyze ALL of them together as evidence of the same person, not one at a time in isolation — break his look down like game film.

Be direct, specific, and constructive — never insulting, never generic. "Your shoulders run narrow for that boxy jacket" is useful; "you could look better" is not. Assume he wants the truth because he wants to look sharp, not a compliment.

Cover:
- What his current style actually communicates right now (even if the answer is "not much of a coherent style yet").
- Concrete strengths already working for him — build on these, don't ignore them.
- Concrete gaps or fit issues you can see (proportions, fit, color, dated pieces, mismatched formality, etc.).
- Best-guess skin undertone (warm/cool/neutral) from the photos and which colors will flatter him vs. wash him out.
- FACE SHAPE, when a photo shows his face clearly enough: best-guess shape (oval, round, square, oblong, heart, diamond) and — more importantly — what follows from it for clothing choices: which collar styles and spread widths frame his face best, lapel width, crew vs. V necklines, scarf/tie knot size, and (if visible) how his hairstyle, facial hair, or glasses interact with collars and necklines. Face-driven picks are among the most underused levers in menswear — be concrete.
- BODY TYPE as a short plain-language read (e.g. "athletic V-shape", "slim/straight", "broad through the middle", "tall and narrow", "compact and powerful") alongside the finer proportion notes (shoulder width, torso-to-leg ratio, neck length, etc.) — stated matter-of-factly and usefully, never as criticism of his body itself. The goal is fit guidance, not body commentary: every body type has a best version, your job is to name the cuts that get him there.
- Recommended silhouettes/cuts that would work well for his frame.

If the photos are too few, too dark, too distant, or don't show his face or enough of his body to say something concrete, say so honestly in the relevant fields ("face not clearly visible in these photos") rather than inventing detail.

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
    : "No style profile has been collected yet — analyze on visuals alone.";

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
    model: AGENT_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    tools: [SUBMIT_ASSESSMENT_TOOL],
    tool_choice: { type: "tool", name: "submit_assessment" },
    output_config: { effort: "medium" },
  };
  const response = await anthropic.messages.create(params);

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "submit_assessment",
  );
  if (!toolUse) {
    throw new Error("Photo analyst did not return an assessment");
  }

  const input = toolUse.input as Record<string, unknown>;
  return {
    numPhotosAnalyzed: images.length,
    currentStyleSummary: String(input.currentStyleSummary ?? ""),
    strengths: Array.isArray(input.strengths) ? (input.strengths as string[]) : [],
    gapsOrIssues: Array.isArray(input.gapsOrIssues) ? (input.gapsOrIssues as string[]) : [],
    skinUndertone: String(input.skinUndertone ?? ""),
    bestColors: Array.isArray(input.bestColors) ? (input.bestColors as string[]) : [],
    colorsToAvoidFromPhotos: Array.isArray(input.colorsToAvoidFromPhotos)
      ? (input.colorsToAvoidFromPhotos as string[])
      : [],
    faceShape: String(input.faceShape ?? ""),
    faceGuidance: Array.isArray(input.faceGuidance) ? (input.faceGuidance as string[]) : [],
    bodyType: String(input.bodyType ?? ""),
    bodyProportionNotes: String(input.bodyProportionNotes ?? ""),
    recommendedSilhouettes: Array.isArray(input.recommendedSilhouettes)
      ? (input.recommendedSilhouettes as string[])
      : [],
    fitGuidance: Array.isArray(input.fitGuidance) ? (input.fitGuidance as string[]) : [],
  };
}
