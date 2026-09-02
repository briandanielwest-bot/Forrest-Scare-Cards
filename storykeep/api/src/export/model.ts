import { query, one } from "../lib/db";
import { genreOf, type GenreSpec } from "../genres";
import type { BookRow } from "../types";

/** What every exporter consumes. Built once, rendered three ways. */
export interface CompiledBook {
  book: BookRow;
  genre: GenreSpec;
  authorName: string;
  frontMatter: FrontMatter;
  sections: { title: string; body: string }[];
  spreads: { position: number; text: string; imageUrl: string | null }[];
  trim: { id: string; label: string; widthIn: number; heightIn: number };
}

export interface FrontMatter {
  title: string;
  subtitle: string;
  byline: string;
  dedication: string;
  epigraph: string;
  authorNote: string;
  backCover: string;
}

export async function compile(bookId: string): Promise<CompiledBook> {
  const book = await one<BookRow>(`SELECT * FROM books WHERE id = $1`, [bookId]);
  if (!book) throw new Error("Book not found");
  const genre = genreOf(book.genre);

  const author = await one<{ display_name: string | null; email: string }>(
    `SELECT display_name, email FROM users WHERE id = $1`,
    [book.user_id],
  );

  const sections = await query<{ title: string; body: string }>(
    `SELECT c.title, COALESCE(d.body, '') AS body
       FROM chapters c LEFT JOIN drafts d ON d.id = c.current_draft_id
      WHERE c.book_id = $1
      ORDER BY c.position`,
    [bookId],
  );

  const spreads = await query<{ position: number; text: string; image_url: string | null }>(
    `SELECT position, text, image_url FROM spreads WHERE book_id = $1 ORDER BY position`,
    [bookId],
  );

  const stored = (book.blueprint as { frontMatter?: FrontMatter }).frontMatter;
  const frontMatter: FrontMatter = stored ?? {
    title: book.title,
    subtitle: book.subtitle ?? "",
    byline: author?.display_name ?? "",
    dedication: "",
    epigraph: "",
    authorNote: "",
    backCover: "",
  };

  const trimId = book.blueprint.trim ?? genre.trimSizes[0].id;
  const trim = genre.trimSizes.find((t) => t.id === trimId) ?? genre.trimSizes[0];

  return {
    book,
    genre,
    authorName: author?.display_name ?? author?.email ?? "",
    frontMatter,
    // An empty chapter must not print as a blank titled page in a book
    // somebody paid to have made.
    sections: sections.filter((s) => s.body.trim().length > 0),
    spreads: spreads.map((s) => ({ position: s.position, text: s.text, imageUrl: s.image_url })),
    trim,
  };
}

/** Paragraphs, with the interview's [ASK: ...] markers stripped for print. */
export function paragraphs(body: string): string[] {
  return body
    .replace(/\[ASK:[^\]]*\]/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}
