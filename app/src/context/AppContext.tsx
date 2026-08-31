import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChatMessage, HoustonStore, StoreCategory, StyleProfile, WardrobePlan } from "../types";

const STORAGE_KEY = "bayouBlazer.session.v1";

interface PersistedSession {
  sessionId: string | null;
  styleProfile: StyleProfile | null;
  wardrobePlan: WardrobePlan | null;
  interviewDone: boolean;
  /** Keys of plan items the user has checked off as bought. */
  purchasedKeys?: string[];
}

interface AppContextValue {
  hydrated: boolean;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  styleProfile: StyleProfile | null;
  setStyleProfile: (p: StyleProfile | null) => void;
  wardrobePlan: WardrobePlan | null;
  setWardrobePlan: (p: WardrobePlan | null) => void;
  stores: HoustonStore[];
  setStores: (s: HoustonStore[]) => void;
  categoryLabels: Record<StoreCategory, string> | null;
  setCategoryLabels: (c: Record<StoreCategory, string> | null) => void;
  storeById: (id: string) => HoustonStore | undefined;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  interviewDone: boolean;
  setInterviewDone: (done: boolean) => void;
  purchasedKeys: string[];
  togglePurchased: (key: string) => void;
  resetSession: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [wardrobePlan, setWardrobePlan] = useState<WardrobePlan | null>(null);
  const [stores, setStores] = useState<HoustonStore[]>([]);
  const [categoryLabels, setCategoryLabels] = useState<Record<StoreCategory, string> | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [interviewDone, setInterviewDone] = useState(false);
  const [purchasedKeys, setPurchasedKeys] = useState<string[]>([]);

  // A phone backgrounding or killing the app mid-flow shouldn't cost a man
  // his finished plan (or the interview he already did). Restore once on
  // launch, then keep persisting as things change.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as PersistedSession;
        if (saved.sessionId) setSessionId(saved.sessionId);
        if (saved.styleProfile) setStyleProfile(saved.styleProfile);
        if (saved.wardrobePlan) setWardrobePlan(saved.wardrobePlan);
        if (saved.interviewDone) setInterviewDone(saved.interviewDone);
        if (Array.isArray(saved.purchasedKeys)) setPurchasedKeys(saved.purchasedKeys);
      })
      .catch(() => {
        // Corrupt data or storage unavailable (private browsing-equivalent,
        // first launch, etc.) — just start fresh.
      })
      .finally(() => setHydrated(true));
  }, []);

  const skipNextPersist = useRef(true);
  useEffect(() => {
    if (skipNextPersist.current) {
      // Don't persist the initial empty state before hydration has had a
      // chance to restore anything — that would clobber a saved session.
      skipNextPersist.current = false;
      return;
    }
    if (!hydrated) return;
    const payload: PersistedSession = { sessionId, styleProfile, wardrobePlan, interviewDone, purchasedKeys };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {
      // Best-effort — losing persistence isn't fatal, the session still
      // works for the rest of this app run.
    });
  }, [hydrated, sessionId, styleProfile, wardrobePlan, interviewDone, purchasedKeys]);

  function resetSession() {
    // Deliberately keeps `stores`/`categoryLabels` cached — the Houston
    // directory doesn't change between one man's session and the next.
    setSessionId(null);
    setStyleProfile(null);
    setWardrobePlan(null);
    setChatMessages([]);
    setInterviewDone(false);
    setPurchasedKeys([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }

  const value = useMemo<AppContextValue>(
    () => ({
      hydrated,
      sessionId,
      setSessionId,
      styleProfile,
      setStyleProfile,
      wardrobePlan,
      setWardrobePlan,
      stores,
      setStores,
      categoryLabels,
      setCategoryLabels,
      storeById: (id: string) => stores.find((s) => s.id === id),
      chatMessages,
      setChatMessages,
      interviewDone,
      setInterviewDone,
      purchasedKeys,
      togglePurchased: (key: string) =>
        setPurchasedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])),
      resetSession,
    }),
    [hydrated, sessionId, styleProfile, wardrobePlan, stores, categoryLabels, chatMessages, interviewDone, purchasedKeys],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within an AppProvider");
  return ctx;
}
