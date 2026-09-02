import { IMAGE_PROVIDER, REPLICATE_API_TOKEN, REPLICATE_IMAGE_MODEL } from "../config";

export interface RenderedImage {
  url: string;
}

export class NoImageProvider extends Error {
  constructor() {
    super("No image provider configured.");
    this.name = "NoImageProvider";
  }
}

export const imagesEnabled = (): boolean =>
  IMAGE_PROVIDER === "replicate" && Boolean(REPLICATE_API_TOKEN);

/**
 * Claude writes the art direction; this renders it.
 *
 * Deliberately one small function behind an interface: the image model market
 * moves every few months, and the valuable, hard-won part of this system is
 * Ink's character sheets and prompts, not whichever renderer is currently best.
 * Swapping providers should be this file and nothing else.
 *
 * When no provider is configured the app still produces the full art brief for
 * every spread and shows it as a card the customer can hand to a human
 * illustrator — which is a real product, not a degraded one.
 */
export async function renderImage(prompt: string, aspect: string): Promise<RenderedImage> {
  if (!imagesEnabled()) throw new NoImageProvider();

  const response = await fetch("https://api.replicate.com/v1/models/" + REPLICATE_IMAGE_MODEL + "/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
      // Ask Replicate to hold the request open until the render finishes, so
      // this is one call rather than a polling loop.
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: aspect,
        output_format: "png",
        safety_tolerance: 2,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Image render failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { output?: string | string[]; status?: string };
  const output = Array.isArray(data.output) ? data.output[0] : data.output;
  if (!output) {
    throw new Error(`Image render returned no output (status: ${data.status ?? "unknown"}).`);
  }
  return { url: output };
}
