"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api, type User } from "./api";

/** Who is signed in, or null. `loading` matters — rendering the signed-out
 *  state during the first fetch makes the app flash "sign in" at people who
 *  are already signed in. */
export function useUser(): { user: User | null; loading: boolean; refresh: () => void } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  // Re-checked on every navigation. The masthead lives in the root layout and
  // therefore does not remount when someone signs in and is pushed to the
  // dashboard — without this it goes on offering "Sign in" to a signed-in
  // person for the rest of the session.
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ user: User | null }>("/api/auth/me")
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick, pathname]);

  return { user, loading, refresh: () => setTick((t) => t + 1) };
}
