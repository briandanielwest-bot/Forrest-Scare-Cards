"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, type User } from "@/lib/api";

function SignInForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(
    params.get("mode") === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post<{ user: User }>(`/api/auth/${mode}`, {
        email,
        password,
        ...(mode === "signup" ? { displayName } : {}),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="narrow" style={{ padding: "56px 20px 80px", maxWidth: 460 }}>
      <h1>{mode === "signup" ? "Start your book" : "Welcome back"}</h1>
      <p className="muted" style={{ marginBottom: 28 }}>
        {mode === "signup"
          ? "Your account keeps everything you say and everything we write, so you can stop and pick it up whenever you like."
          : "Everything you've written is where you left it."}
      </p>

      {error ? <div className="notice error">{error}</div> : null}

      <form onSubmit={submit}>
        {mode === "signup" ? (
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              placeholder="Ruth Callan"
            />
            <p className="hint">This is how you'll be credited on the book.</p>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          {mode === "signup" ? (
            <p className="hint">
              At least 10 characters. A short phrase you'll remember is better than a
              complicated word you won't.
            </p>
          ) : null}
        </div>

        <button className="btn big" style={{ width: "100%" }} disabled={busy}>
          {busy ? "One moment…" : mode === "signup" ? "Create my account" : "Sign in"}
        </button>
      </form>

      <p className="muted" style={{ marginTop: 24, textAlign: "center" }}>
        {mode === "signup" ? "Already have an account? " : "New here? "}
        <button
          className="btn quiet"
          style={{ minHeight: "auto", padding: "4px 10px" }}
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
          }}
        >
          {mode === "signup" ? "Sign in" : "Create one"}
        </button>
      </p>
    </div>
  );
}

export default function SignInPage() {
  // useSearchParams needs a Suspense boundary in the app router, or the whole
  // route opts out of static rendering with a build-time warning.
  return (
    <Suspense fallback={<div className="narrow" style={{ padding: 56 }}>Loading…</div>}>
      <SignInForm />
    </Suspense>
  );
}
