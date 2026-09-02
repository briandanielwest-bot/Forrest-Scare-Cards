"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError, type Book, type Spread } from "@/lib/api";
import { BookNav } from "@/components/BookNav";

interface ArtBible {
  style: string;
  palette: string;
  characters: { name: string; sheet: string }[];
}

/**
 * The pictures.
 *
 * Note what happens when no renderer is configured: the art briefs still get
 * written and shown, because a book of directed spreads is something a
 * customer can hand to a human illustrator. The rendering is a convenience on
 * top of the real work, not the work itself.
 */
export default function PicturesPage() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [spreads, setSpreads] = useState<Spread[]>([]);
  const [artBible, setArtBible] = useState<ArtBible | null>(null);
  const [canRender, setCanRender] = useState(false);
  const [style, setStyle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [bookData, art] = await Promise.all([
      api.get<{ book: Book; spreads: Spread[] }>(`/api/books/${id}`),
      api.get<{ artBible: ArtBible | null; spreads: Spread[]; canRender: boolean }>(
        `/api/books/${id}/art`,
      ),
    ]);
    setBook(bookData.book);
    setSpreads(art.spreads);
    setArtBible(art.artBible);
    setCanRender(art.canRender);
  }, [id]);

  useEffect(() => {
    load().catch((err) =>
      setError(err instanceof ApiError ? err.message : "Couldn't open the pictures."),
    );
  }, [load]);

  async function writeSpreads() {
    setBusy("writing");
    setError(null);
    try {
      await api.post(`/api/books/${id}/write-spreads`, {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't write the spreads.");
    } finally {
      setBusy(null);
    }
  }

  async function directArt() {
    setBusy("briefing");
    setError(null);
    try {
      await api.post(`/api/books/${id}/art/brief`, { style });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ink couldn't direct the art.");
    } finally {
      setBusy(null);
    }
  }

  async function render(spreadId: string) {
    setBusy(spreadId);
    setError(null);
    try {
      await api.post(`/api/books/${id}/art/spreads/${spreadId}/render`, {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That picture didn't render.");
    } finally {
      setBusy(null);
    }
  }

  const written = spreads.some((s) => s.text.trim());

  return (
    <div className="wrap" style={{ padding: "32px 20px 80px" }}>
      {book ? <BookNav bookId={id} book={book} /> : null}
      {error ? <div className="notice error">{error}</div> : null}

      {!written ? (
        <div className="card" style={{ textAlign: "center", padding: 44 }}>
          <h2>Write the words first</h2>
          <p className="muted" style={{ marginBottom: 22 }}>
            A picture book gets written all at once, because a page turn only works if one
            mind is holding the whole book. Then Ink directs the art.
          </p>
          <button className="btn big" onClick={writeSpreads} disabled={busy !== null}>
            {busy === "writing" ? "Writing the book…" : "Write the book"}
          </button>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 22 }}>
            <div className="spread-between">
              <div>
                <h2 style={{ marginBottom: 4 }}>The look of it</h2>
                <p className="muted" style={{ margin: 0 }}>
                  {artBible
                    ? "Ink has set the style. Every picture is drawn to it, so your characters stay the same people from page to page."
                    : "Tell Ink how you picture it, and it will set a style every page follows."}
                </p>
              </div>
            </div>

            {artBible ? (
              <div style={{ marginTop: 16 }}>
                <p><strong>Style.</strong> {artBible.style}</p>
                <p><strong>Colours.</strong> {artBible.palette}</p>
                {artBible.characters.map((character) => (
                  <p key={character.name} className="muted" style={{ fontSize: "0.94rem" }}>
                    <strong>{character.name}:</strong> {character.sheet}
                  </p>
                ))}
              </div>
            ) : null}

            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="style">How do you picture it?</label>
              <input
                id="style"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="Soft watercolour, warm, a bit old-fashioned"
              />
            </div>
            <button className="btn" onClick={directArt} disabled={busy !== null}>
              {busy === "briefing" ? "Ink is working…" : artBible ? "Direct it again" : "Direct the art"}
            </button>
          </div>

          {!canRender && artBible ? (
            <div className="notice warn">
              <strong>Rendering isn't switched on for this deployment.</strong> Every spread
              below has a finished art brief — that's exactly what you'd hand to an
              illustrator, and it's what the animation is quoted from.
            </div>
          ) : null}

          <div className="stack">
            {spreads.map((spread) => (
              <div className="card" key={spread.id}>
                <div className="spread-card">
                  <div className="spread-plate">
                    {spread.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={spread.image_url} alt={`Spread ${spread.position + 1}`} />
                    ) : (
                      <span className="faint">Spread {spread.position + 1}</span>
                    )}
                  </div>
                  <div>
                    <p style={{ fontFamily: "var(--serif)", fontSize: "1.15rem" }}>
                      {spread.text || <span className="faint">No words on this spread.</span>}
                    </p>
                    {spread.art_brief ? (
                      <details>
                        <summary style={{ cursor: "pointer", color: "var(--ink-soft)" }}>
                          The art direction
                        </summary>
                        <p className="muted" style={{ whiteSpace: "pre-wrap", fontSize: "0.92rem" }}>
                          {spread.art_brief}
                        </p>
                      </details>
                    ) : null}
                    {canRender && spread.art_brief ? (
                      <button
                        className="btn quiet"
                        style={{ marginTop: 12 }}
                        onClick={() => render(spread.id)}
                        disabled={busy !== null}
                      >
                        {busy === spread.id
                          ? "Drawing…"
                          : spread.image_url
                            ? "Draw it again"
                            : "Draw this one"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
