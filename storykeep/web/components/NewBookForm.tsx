"use client";

import { useEffect, useState } from "react";
import { api, ApiError, type Book } from "@/lib/api";

interface GenreOption {
  key: "memoir" | "kids" | "keepsake";
  label: string;
  blurb: string;
  unit: string;
  defaultUnits: number;
  minUnits: number;
  maxUnits: number;
  estimatedPages: number;
  trimSizes: { id: string; label: string }[];
}

const ASSIST = [
  {
    key: "ghostwriter",
    label: "Write it for me",
    blurb: "You talk, we write the whole thing, you approve it.",
  },
  {
    key: "cowriter",
    label: "Write it with me",
    blurb: "We draft, you rewrite, we polish around your words.",
  },
  {
    key: "coach",
    label: "Just coach me",
    blurb: "You write every word. We ask, prompt, and push back — but never write.",
  },
] as const;

export function NewBookForm({
  onCreated,
  onCancel,
}: {
  onCreated: (book: Book) => void;
  onCancel: () => void;
}) {
  const [genres, setGenres] = useState<GenreOption[] | null>(null);
  const [genre, setGenre] = useState<GenreOption["key"]>("memoir");
  const [assist, setAssist] = useState<(typeof ASSIST)[number]["key"]>("ghostwriter");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [units, setUnits] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ genres: GenreOption[] }>("/api/books/genres")
      .then((data) => setGenres(data.genres))
      .catch(() => setError("Couldn't load the book types."));
  }, []);

  const selected = genres?.find((g) => g.key === genre);
  const chosenUnits = units ?? selected?.defaultUnits ?? 12;

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api.post<{ book: Book }>("/api/books", {
        genre,
        assistLevel: assist,
        title: title.trim() || undefined,
        brief: brief.trim() || undefined,
        units: chosenUnits,
      });
      onCreated(data.book);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start the book.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={create} style={{ marginBottom: 28 }}>
      <h2>What are we making?</h2>
      {error ? <div className="notice error">{error}</div> : null}

      <div className="grid three" style={{ margin: "18px 0 24px" }}>
        {(genres ?? []).map((option) => (
          <button
            type="button"
            key={option.key}
            onClick={() => {
              setGenre(option.key);
              setUnits(null);
            }}
            className="card"
            style={{
              textAlign: "left",
              cursor: "pointer",
              borderColor: genre === option.key ? "var(--accent)" : "var(--rule)",
              borderWidth: genre === option.key ? 2 : 1,
              background: genre === option.key ? "var(--accent-soft)" : "var(--paper-raised)",
              font: "inherit",
              boxShadow: "none",
            }}
          >
            <strong>{option.label}</strong>
            <p className="muted" style={{ fontSize: "0.92rem", margin: "8px 0 0" }}>
              {option.blurb}
            </p>
          </button>
        ))}
      </div>

      <div className="field">
        <label htmlFor="title">What should we call it, for now?</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Leave it blank and we'll suggest one later"
        />
      </div>

      <div className="field">
        <label htmlFor="brief">
          Anything we should know before we start? {selected?.key === "kids" ? "(who it's for, how old they are)" : "(who it's about, who it's for)"}
        </label>
        <textarea
          id="brief"
          rows={3}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder={
            selected?.key === "kids"
              ? "For my granddaughter Nell, she's four and obsessed with dogs"
              : "It's about my father, mostly the years on the farm before he got sick"
          }
        />
      </div>

      {selected ? (
        <div className="field">
          <label htmlFor="units">
            How long? {selected.unit === "spread" ? "Spreads" : "Chapters"}: {chosenUnits} ·
            roughly {Math.round((selected.estimatedPages / selected.defaultUnits) * chosenUnits)} pages
          </label>
          <input
            id="units"
            type="range"
            min={selected.minUnits}
            max={selected.maxUnits}
            value={chosenUnits}
            onChange={(e) => setUnits(Number(e.target.value))}
            style={{ padding: 0, minHeight: "auto" }}
          />
          <p className="hint">You can change this at any point. Nothing is locked in.</p>
        </div>
      ) : null}

      <div className="field">
        <label>How much help do you want?</label>
        <div className="stack">
          {ASSIST.map((option) => (
            <label
              key={option.key}
              className="row"
              style={{ alignItems: "flex-start", cursor: "pointer", fontWeight: 400 }}
            >
              <input
                type="radio"
                name="assist"
                checked={assist === option.key}
                onChange={() => setAssist(option.key)}
                style={{ width: 20, minHeight: "auto", marginTop: 4, flex: "0 0 auto" }}
              />
              <span>
                <strong>{option.label}</strong>
                <br />
                <span className="muted" style={{ fontSize: "0.92rem" }}>
                  {option.blurb}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="row">
        <button className="btn big" disabled={busy}>
          {busy ? "Setting it up…" : "Start talking"}
        </button>
        <button type="button" className="btn quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
