"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, type Book } from "@/lib/api";
import { useUser } from "@/lib/useUser";
import { NewBookForm } from "@/components/NewBookForm";

export default function Dashboard() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [books, setBooks] = useState<Book[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<{ books: Book[] }>("/api/books")
      .then((data) => setBooks(data.books))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load your books."));
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/signin");
    if (user) load();
  }, [user, loading, router, load]);

  if (loading || !user) return <div className="wrap" style={{ padding: 56 }}>Loading…</div>;

  return (
    <div className="wrap" style={{ padding: "40px 20px 80px" }}>
      <div className="spread-between" style={{ marginBottom: 28 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Your books</h1>
          <p className="muted" style={{ margin: 0 }}>
            {user.display_name ? `Signed in as ${user.display_name}` : user.email}
          </p>
        </div>
        <button className="btn" onClick={() => setCreating((c) => !c)}>
          {creating ? "Never mind" : "Start a new book"}
        </button>
      </div>

      {error ? <div className="notice error">{error}</div> : null}

      {creating ? (
        <NewBookForm
          onCreated={(book) => router.push(`/book/${book.id}/talk`)}
          onCancel={() => setCreating(false)}
        />
      ) : null}

      {books === null ? (
        <p className="muted">Loading…</p>
      ) : books.length === 0 && !creating ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <h2>Nothing here yet</h2>
          <p className="muted" style={{ marginBottom: 22 }}>
            Start with a small one if you're not sure — a single moment you'd like kept.
            You can always start something longer later.
          </p>
          <button className="btn big" onClick={() => setCreating(true)}>
            Start your first book
          </button>
        </div>
      ) : (
        <div className="grid two">
          {books.map((book) => (
            <BookCard key={book.id} book={book} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookCard({ book, onChanged }: { book: Book; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const written = Number(book.written_count ?? 0);
  const total = Number(book.chapter_count ?? 0);
  const words = Number(book.words ?? 0);

  const label =
    total === 0
      ? "Still interviewing"
      : written === 0
        ? `${total} chapters planned`
        : `${written} of ${total} written`;

  return (
    <div className="card">
      <div className="spread-between" style={{ alignItems: "flex-start" }}>
        <div>
          <span className="pill">{genreLabel(book.genre)}</span>
          <h3 style={{ margin: "12px 0 4px" }}>{book.title}</h3>
          <p className="faint" style={{ margin: 0 }}>
            {label}
            {words > 0 ? ` · ${words.toLocaleString()} words` : ""}
          </p>
        </div>
      </div>

      <div className="row" style={{ marginTop: 18 }}>
        <Link className="btn" href={`/book/${book.id}/talk`}>
          {total === 0 ? "Keep talking" : "Continue"}
        </Link>
        {total > 0 ? (
          <Link className="btn quiet" href={`/book/${book.id}/manuscript`}>
            Read it
          </Link>
        ) : null}
        {written > 0 ? (
          <Link className="btn quiet" href={`/book/${book.id}/finish`}>
            Finish
          </Link>
        ) : null}
      </div>

      <div style={{ marginTop: 14 }}>
        {confirming ? (
          <div className="notice error" style={{ margin: 0 }}>
            <p style={{ marginTop: 0 }}>
              Delete <strong>{book.title}</strong> and everything in it? This cannot be undone.
            </p>
            <div className="row">
              <button
                className="btn danger"
                onClick={async () => {
                  await api.del(`/api/books/${book.id}`);
                  onChanged();
                }}
              >
                Yes, delete it
              </button>
              <button className="btn quiet" onClick={() => setConfirming(false)}>
                Keep it
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn quiet"
            style={{ minHeight: "auto", padding: "4px 10px", fontSize: "0.85rem" }}
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function genreLabel(genre: Book["genre"]): string {
  if (genre === "kids") return "Picture book";
  if (genre === "keepsake") return "Keepsake";
  return "Memoir";
}
