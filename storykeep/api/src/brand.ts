/**
 * The one file to edit when the product gets its real name.
 *
 * Everything user-visible — page titles, email copy, export front matter,
 * the PDF colophon — reads from here. Renaming the product is this file
 * plus the two `name` fields in ../../render.yaml.
 */
export const BRAND = {
  name: "Storykeep",
  tagline: "You talk. It becomes a book.",
  /** Shown on the last page of every export. */
  colophon: "Made with Storykeep",
  supportEmail: "hello@storykeep.example",
} as const;
