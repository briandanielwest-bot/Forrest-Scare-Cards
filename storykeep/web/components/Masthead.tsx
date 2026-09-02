"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useUser } from "@/lib/useUser";

export function Masthead() {
  const { user, loading, refresh } = useUser();
  const router = useRouter();

  async function signOut() {
    await api.post("/api/auth/signout").catch(() => undefined);
    refresh();
    router.push("/");
  }

  return (
    <header className="masthead">
      <div className="masthead-inner">
        <Link href={user ? "/dashboard" : "/"} className="wordmark">
          Storykeep
        </Link>
        <nav>
          {/* Nothing renders during the first fetch: flashing "Sign in" at
              somebody who is already signed in reads as being logged out. */}
          {loading ? null : user ? (
            <>
              <Link href="/dashboard">My books</Link>
              <button className="btn quiet" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/#how">How it works</Link>
              <Link href="/signin" className="btn">
                Sign in
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
