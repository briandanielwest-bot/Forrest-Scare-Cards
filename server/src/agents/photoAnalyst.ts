import type Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "../anthropicClient";
import { AGENT_MODEL } from "../config";
import type { PhotoAssessment, StyleProfile, UploadedImage } from "../types";

/**
 * "The Eye" — Photo Analyst Agent.
 *
 * Looks at as many photos of the man as he'll upload (current outfits,
 * candid full-body shots, whatever he has) and works out what his look
 * currently is, what's working, what isn't, his coloring, and what
 * silhouettes/fits would serve him — merged later with his stated style
 * profile by the Wardrobe Planner.
 */

const SYSTEM_PROMPT = `You are "The Eye," the photo analysis agent inside the Bayou & Blazer men's style app. You are given one or more photos of a man — could be current outfits, candid full-body shots, mirror selfies, whatever he uploaded. Analyze ALL of them together as evidence of the same person, not one at a time in isolation.

Be direct, specific, and constructive — never insulting, never generic. "Your shoulders run narrow for that boxy jacket" is useful; "you could look better" is not. Assume he wants the truth because he wants to look sharp, not a compliment.

Cover:
- What his current style actually communicates right now (even if the answer is "not much of a coherent style yet").
- Concrete strengths already working for him — build on these, don't ignore them.
- Concrete gaps or fit issues you can see (proportions, fit, color, dated pieces, mismatched formality, etc.).
- Best-guess skin undertone (warm/cool/neutral) from the photos and which colors will flatter him vs. wash him out.
- Body proportion notes relevant to fit (shoulder width, torso-to-leg ratio, etc.) stated matter-of-factly and usefully, never as criticism of his body itself — the goal is fit guidance, not body commentary.
- Recommended silhouettes/cuts that would work well for his frame.

If the photos are too few, too dark, too distant, or don't show enough of his body/outfit to say something concrete, say so honestly in the relevant fields rather than inventing detail.

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

  const response = await anthropic.messages.create({
    model: AGENT_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    tools: [SUBMIT_ASSESSMENT_TOOL],
    tool_choice: { type: "tool", name: "submit_assessment" },
  });

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
    bodyProportionNotes: String(input.bodyProportionNotes ?? ""),
    recommendedSilhouettes: Array.isArray(input.recommendedSilhouettes)
      ? (input.recommendedSilhouettes as string[])
      : [],
    fitGuidance: Array.isArray(input.fitGuidance) ? (input.fitGuidance as string[]) : [],
  };
}
