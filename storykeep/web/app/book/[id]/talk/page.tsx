"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, API_BASE, ApiError, type Book, type Turn } from "@/lib/api";
import { Recorder, type RecordingResult } from "@/components/Recorder";

interface QuestionState {
  acknowledgement: string;
  question: string;
  why: string;
  enoughForThisChapter: boolean;
}

/**
 * The interview room.
 *
 * Deliberately the plainest screen in the product: one question, one
 * microphone, and the conversation so far underneath. No progress bar, no
 * chapter navigation, no upsell. Someone is about to talk about their dead
 * mother; the interface should get out of the way.
 */
export default function TalkPage() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState<QuestionState | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState<"idle" | "asking" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const started = useRef(false);

  const ask = useCallback(
    async (interview: string) => {
      setBusy("asking");
      setError(null);
      try {
        const next = await api.post<QuestionState>(
          `/api/books/${id}/interviews/${interview}/next`,
          {},
        );
        setQuestion(next);
        setTurns((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            role: "agent",
            text: next.question,
            source: "text",
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Wren couldn't think of a question just now.");
      } finally {
        setBusy("idle");
      }
    },
    [id],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        const bookData = await api.get<{ book: Book }>(`/api/books/${id}`);
        setBook(bookData.book);
        const session = await api.post<{ interviewId: string; turns: Turn[] }>(
          `/api/books/${id}/interviews/start`,
          {},
        );
        setInterviewId(session.interviewId);
        setTurns(session.turns);

        // Resuming mid-conversation must not re-ask the question the author was
        // in the middle of answering when they closed the tab.
        const last = session.turns[session.turns.length - 1];
        if (last?.role === "agent") {
          setQuestion({ acknowledgement: "", question: last.text, why: "", enoughForThisChapter: false });
        } else {
          await ask(session.interviewId);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Couldn't open this book.");
      }
    })();
  }, [id, ask]);

  async function submitText() {
    if (!interviewId || !typed.trim()) return;
    const text = typed.trim();
    setTyped("");
    await submit(async () => {
      await api.post(`/api/books/${id}/interviews/${interviewId}/answer`, { text, source: "text" });
      return text;
    });
  }

  async function submitVoice(result: RecordingResult) {
    if (!interviewId) return;
    if (!result.blob && !result.transcript) {
      setError("We didn't catch that. Try again, or type it instead.");
      return;
    }
    await submit(async () => {
      const form = new FormData();
      if (result.blob) form.append("audio", result.blob, "answer.webm");
      form.append("transcript", result.transcript);
      form.append("seconds", String(result.seconds));
      const response = await api.form<{ text: string }>(
        `/api/books/${id}/interviews/${interviewId}/voice`,
        form,
      );
      return response.text;
    });
  }

  async function submit(send: () => Promise<string>) {
    setBusy("saving");
    setError(null);
    try {
      const text = await send();
      setTurns((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          role: "author",
          text,
          source: "voice",
          created_at: new Date().toISOString(),
        },
      ]);
      setSaved(true);
      if (interviewId) await ask(interviewId);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "That didn't save. Nothing you've already said is lost — try once more.",
      );
      setBusy("idle");
    }
  }

  async function pause() {
    if (interviewId) {
      await api.post(`/api/books/${id}/interviews/${interviewId}/pause`, {}).catch(() => undefined);
    }
  }

  const answered = turns.filter((t) => t.role === "author").length;

  return (
    <div className="talk">
      <div className="spread-between" style={{ marginBottom: 32 }}>
        <div>
          <Link href="/dashboard" className="faint" style={{ textDecoration: "none" }}>
            ← All books
          </Link>
          <h2 style={{ margin: "6px 0 0", fontSize: "1.2rem" }}>{book?.title ?? "…"}</h2>
        </div>
        <div className="row">
          {answered > 0 ? (
            <Link className="btn quiet" href={`/book/${id}/manuscript`} onClick={pause}>
              See the book
            </Link>
          ) : null}
          <Link className="btn quiet" href="/dashboard" onClick={pause}>
            Stop for now
          </Link>
        </div>
      </div>

      {error ? <div className="notice error">{error}</div> : null}

      {question?.acknowledgement ? (
        <p className="talk-ack">{question.acknowledgement}</p>
      ) : null}

      {busy === "asking" && !question ? (
        <p className="working">
          <span className="dot" /> Wren is thinking of where to start…
        </p>
      ) : (
        <>
          <p className="talk-question">{question?.question ?? ""}</p>
          {question?.why ? <p className="talk-why">{question.why}</p> : null}
        </>
      )}

      {question?.enoughForThisChapter ? (
        <div className="notice ok">
          <strong>There's enough here to write from.</strong>{" "}
          Keep going if you want to — more is always better — or{" "}
          <Link href={`/book/${id}/manuscript`} onClick={pause}>
            go and see the pages
          </Link>
          .
        </div>
      ) : null}

      {turns.length > 1 ? (
        <div className="transcript-log">
          <h3 className="faint" style={{ fontFamily: "var(--sans)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Everything so far {saved ? "· saved" : ""}
          </h3>
          {turns
            .slice()
            .reverse()
            .map((turn) => (
              <div key={turn.id} className={`transcript-turn ${turn.role}`}>
                <p className="who">{turn.role === "agent" ? "Wren asked" : "You said"}</p>
                <p style={{ margin: 0 }}>{turn.text}</p>
              </div>
            ))}
        </div>
      ) : null}

      <div className="recorder">
        <div className="recorder-inner">
          <Recorder onFinish={submitVoice} busy={busy === "saving"} disabled={!interviewId} />
          <details>
            <summary style={{ cursor: "pointer", color: "var(--ink-soft)" }}>
              I'd rather type it
            </summary>
            <div style={{ marginTop: 12 }}>
              <label htmlFor="typed" className="sr-only">
                Your answer
              </label>
              <textarea
                id="typed"
                rows={4}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Take as long as you like."
              />
              <button
                className="btn"
                style={{ marginTop: 10 }}
                onClick={submitText}
                disabled={busy !== "idle" || !typed.trim()}
              >
                {busy === "saving" ? "Saving…" : "Send that"}
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
