"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError, type Book, type Chapter, type Review } from "@/lib/api";
import { BookNav } from "@/components/BookNav";

/**
 * The manuscript. Chapter list on the left, the page itself on the right, set
 * in a serif at book measure — because the only question the author is really
 * asking on this screen is "does this read like a book?", and it cannot be
 * answered in a textarea that looks like an email.
 */
export default function ManuscriptPage() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<null | "planning" | "writing" | "saving">(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await api.get<{ book: Book; chapters: Chapter[]; reviews: Review[] }>(
      `/api/books/${id}`,
    );
    setBook(data.book);
    setChapters(data.chapters);
    setReviews(data.reviews);
    setActiveId((current) => current ?? data.chapters[0]?.id ?? null);
    return data;
  }, [id]);

  useEffect(() => {
    load().catch((err) =>
      setError(err instanceof ApiError ? err.message : "Couldn't open this book."),
    );
  }, [load]);

  const active = chapters.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    // Never clobber unsaved edits when the chapter list refreshes underneath.
    if (!dirty) setBody(active?.body ?? "");
  }, [active, dirty]);

  async function plan() {
    setBusy("planning");
    setError(null);
    try {
      await api.post(`/api/books/${id}/plan`, {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Atlas couldn't shape the book yet.");
    } finally {
      setBusy(null);
    }
  }

  async function write() {
    if (!activeId) return;
    setBusy("writing");
    setError(null);
    try {
      await api.post(`/api/books/${id}/chapters/${activeId}/write`, {});
      setDirty(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Quill couldn't write that one.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!activeId) return;
    setBusy("saving");
    try {
      await api.put(`/api/books/${id}/chapters/${activeId}/draft`, { body });
      setDirty(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that.");
    } finally {
      setBusy(null);
    }
  }

  if (error && !book) {
    return (
      <div className="wrap" style={{ padding: 56 }}>
        <div className="notice error">{error}</div>
      </div>
    );
  }

  if (book && chapters.length === 0) {
    return (
      <div className="narrow" style={{ padding: "48px 20px 80px" }}>
        <BookNav bookId={id} book={book} />
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <h2>Nothing to shape yet</h2>
          <p className="muted" style={{ marginBottom: 24 }}>
            Atlas builds the outline from what you've told Wren. Talk for a little longer
            first, then come back — or try now and see what shape it finds.
          </p>
          {error ? <div className="notice error">{error}</div> : null}
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="btn quiet" href={`/book/${id}/talk`}>
              Keep talking
            </Link>
            <button className="btn" onClick={plan} disabled={busy !== null}>
              {busy === "planning" ? "Shaping it…" : "Shape the book"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const chapterReviews = reviews.filter((r) => r.chapter_id === activeId);

  return (
    <div className="wrap" style={{ padding: "32px 20px 80px" }}>
      {book ? <BookNav bookId={id} book={book} /> : null}
      {error ? <div className="notice error">{error}</div> : null}

      <div className="manuscript">
        <div>
          <ul className="chapter-list">
            {chapters.map((chapter, index) => (
              <li key={chapter.id}>
                <button
                  className={chapter.id === activeId ? "active" : ""}
                  onClick={() => {
                    setDirty(false);
                    setActiveId(chapter.id);
                  }}
                >
                  <span className="n">{index + 1}</span>
                  {chapter.title}
                  <br />
                  <span className="faint">
                    {chapter.word_count ? `${chapter.word_count.toLocaleString()} words` : "not written"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            className="btn quiet"
            style={{ marginTop: 14, width: "100%" }}
            onClick={plan}
            disabled={busy !== null}
          >
            {busy === "planning" ? "Reshaping…" : "Reshape the outline"}
          </button>
          <p className="hint">
            Rewrites the plan from everything you've said since. Chapters you've already
            written are kept.
          </p>
        </div>

        <div>
          {active ? (
            <>
              <div className="spread-between" style={{ marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>{active.title}</h2>
                <div className="row">
                  {dirty ? (
                    <button className="btn" onClick={save} disabled={busy !== null}>
                      {busy === "saving" ? "Saving…" : "Save my changes"}
                    </button>
                  ) : null}
                  <button className="btn quiet" onClick={write} disabled={busy !== null}>
                    {busy === "writing"
                      ? "Writing…"
                      : active.current_draft_id
                        ? "Write it again"
                        : "Write this chapter"}
                  </button>
                </div>
              </div>

              {active.brief ? (
                <details style={{ marginBottom: 16 }}>
                  <summary style={{ cursor: "pointer", color: "var(--ink-soft)" }}>
                    What this chapter is meant to do
                  </summary>
                  <p className="muted" style={{ marginTop: 8 }}>{active.brief}</p>
                </details>
              ) : null}

              {busy === "writing" ? (
                <p className="working">
                  <span className="dot" /> Quill is writing, then four readers check it. This
                  takes a minute or two.
                </p>
              ) : null}

              <textarea
                className="page-editor"
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setDirty(true);
                }}
                placeholder="Nothing written here yet. Press 'Write this chapter' and Quill will draft it from what you've told Wren."
              />

              {body.includes("[ASK:") ? (
                <div className="notice warn">
                  <strong>Quill needs a few facts.</strong> The bracketed{" "}
                  <code>[ASK: …]</code> notes in the text are questions it couldn't answer from
                  what you've said. Answer them in an interview and write the chapter again —
                  it won't guess.{" "}
                  <Link href={`/book/${id}/talk`}>Go and answer them</Link>.
                </div>
              ) : null}

              {chapterReviews.length ? (
                <div className="notes">
                  <h3>What the readers said</h3>
                  {chapterReviews.map((note) => (
                    <div key={note.id} className={`note ${note.severity}`}>
                      <p className="agent-name">{agentName(note.agent)}</p>
                      <p style={{ margin: "2px 0" }}>{note.message}</p>
                      {note.detail?.quote ? (
                        <p className="quote" style={{ margin: "4px 0" }}>
                          “{note.detail.quote}”
                        </p>
                      ) : null}
                      {note.detail?.fix ? (
                        <p className="muted" style={{ margin: "4px 0", fontSize: "0.94rem" }}>
                          Suggestion: {note.detail.fix}
                        </p>
                      ) : null}
                      <button
                        className="btn quiet"
                        style={{ minHeight: "auto", padding: "3px 10px", fontSize: "0.85rem" }}
                        onClick={async () => {
                          await api.post(`/api/books/${id}/reviews/${note.id}/resolve`, {});
                          await load();
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const AGENT_NAMES: Record<string, string> = {
  continuity: "Ledger — continuity",
  originality: "Sable — originality",
  sensitivity: "Iris — the careful read",
  reader: "Pip — read it cold",
  editor: "Marla — the edit",
};

function agentName(agent: string): string {
  return AGENT_NAMES[agent] ?? agent;
}
