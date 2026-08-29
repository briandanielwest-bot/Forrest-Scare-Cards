import React, { createContext, useContext, useMemo, useState } from "react";
import type { ChatMessage, HoustonStore, StoreCategory, StyleProfile, WardrobePlan } from "../types";

interface AppContextValue {
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
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [wardrobePlan, setWardrobePlan] = useState<WardrobePlan | null>(null);
  const [stores, setStores] = useState<HoustonStore[]>([]);
  const [categoryLabels, setCategoryLabels] = useState<Record<StoreCategory, string> | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [interviewDone, setInterviewDone] = useState(false);

  const value = useMemo<AppContextValue>(
    () => ({
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
    }),
    [sessionId, styleProfile, wardrobePlan, stores, categoryLabels, chatMessages, interviewDone],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within an AppProvider");
  return ctx;
}
