import { memoir } from "./memoir";
import { kids } from "./kids";
import { keepsake } from "./keepsake";
import type { GenreKey, GenreSpec } from "./types";

export * from "./types";

export const GENRES: Record<GenreKey, GenreSpec> = { memoir, kids, keepsake };

export const GENRE_LIST: GenreSpec[] = [memoir, kids, keepsake];

export function genreOf(key: string): GenreSpec {
  const spec = GENRES[key as GenreKey];
  if (!spec) throw new Error(`Unknown genre: ${key}`);
  return spec;
}

/** Rough finished page count, used for quotes and for the progress meter. */
export function estimatePages(spec: GenreSpec, units: number): number {
  if (spec.unit === "spread") return units * 2 + 8; // + front and back matter
  const words = units * ((spec.wordsPerUnit.low + spec.wordsPerUnit.high) / 2);
  return Math.round(words / 280) + 6;
}
