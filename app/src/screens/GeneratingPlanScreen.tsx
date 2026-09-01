import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppContext } from "../context/AppContext";
import type { WardrobePlan } from "../types";
import { getPlanStatus, startPlanGeneration } from "../api/client";
import { KylaPortrait } from "../components/KylaPortrait";
import { TeamAvatar } from "../components/TeamAvatar";
import { TEAM } from "../data/team";
import { KYLA_TIPS } from "../data/kylaTips";
import { colors, radii, spacing, typography } from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "GeneratingPlan">;

// 2s keeps the finished plan from sitting unseen — with ~70s generations,
// the poll traffic is trivial (the GET is exempt from rate limiting).
const POLL_INTERVAL_MS = 2000;
// Long enough to actually read a name, a title, and a duty line — the
// whole roster of eight gets a moment across a ~60s generation.
const ROTATE_INTERVAL_MS = 6000;
// Six agents with full store knowledge take a while on a rich profile —
// observed real generations run past 4 minutes, so the cutoff sits at 6.
const MAX_POLL_MS = 6 * 60 * 1000;

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

interface WaitCard {
  kind: "tip" | "store";
  title: string;
  text: string;
}

export function GeneratingPlanScreen({ navigation }: Props) {
  const { sessionId, setWardrobePlan, stores } = useAppContext();
  const [error, setError] = useState<string | null>(null);
  const [memberIndex, setMemberIndex] = useState(0);
  const [draftedPhases, setDraftedPhases] = useState<string[]>([]);
  const [draftedPlanPhases, setDraftedPlanPhases] = useState<WardrobePlan["phases"]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const startedAtRef = useRef(Date.now());

  // The while-you-wait deck: her tips interleaved with real facts about
  // the stores his experts are walking right now. Built once per mount
  // from data already on the device — zero network, zero latency.
  const deckRef = useRef<WaitCard[] | null>(null);
  if (!deckRef.current) {
    const tips: WaitCard[] = KYLA_TIPS.map((t) => ({ kind: "tip", title: "KYLA'S TIP", text: t }));
    const facts: WaitCard[] = stores
      .filter((st) => st.knownFor)
      .map((st) => ({ kind: "store", title: st.name.toUpperCase(), text: st.knownFor! }));
    const deck: WaitCard[] = [];
    const shuffled = [...facts].sort(() => Math.random() - 0.5);
    // Alternate: tip, store fact, tip, store fact…
    for (let i = 0; i < Math.max(tips.length, shuffled.length); i++) {
      if (tips[i]) deck.push(tips[i]);
      if (shuffled[i]) deck.push(shuffled[i]);
    }
    deckRef.current = deck.length > 0 ? deck : tips;
  }
  const deck = deckRef.current;

  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMemberIndex((i) => (i + 1) % TEAM.length);
    }, ROTATE_INTERVAL_MS);
    const ticker = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 1000);
    const deckTimer = setInterval(() => setCardIndex((i) => i + 1), 8000);
    return () => {
      clearInterval(interval);
      clearInterval(ticker);
      clearInterval(deckTimer);
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const result = await getPlanStatus(sessionId!);
        if (cancelled) return;
        if (result.draftedPhases?.length) setDraftedPhases(result.draftedPhases);
        if (result.draftedPlanPhases?.length) setDraftedPlanPhases(result.draftedPlanPhases);

        if (result.status === "done" && result.plan) {
          setWardrobePlan(result.plan);
          navigation.replace("Plan");
          return;
        }
        if (result.status === "error") {
          setError(result.error ?? "The team hit a snag building your plan.");
          return;
        }
        if (Date.now() - startedAtRef.current > MAX_POLL_MS) {
          setError(
            "This ran way past normal. The usual culprits: the free-tier server was asleep and is still waking up, " +
              "or a rare bad generation triggered an automatic retry. Your interview is saved, tap Try again.",
          );
          return;
        }
        pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Lost connection while building your plan.");
      }
    }

    startedAtRef.current = Date.now();
    startPlanGeneration(sessionId)
      .then(() => {
        if (!cancelled) poll();
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't start building your plan.");
      });

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
    };
  }, [sessionId]);

  const member = TEAM[memberIndex % TEAM.length];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {error ? (
          <>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => navigation.replace("GeneratingPlan")}>
              <Text style={styles.retry}>Try again</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.gold} />
            <Text style={styles.stage}>YOUR TEAM IS BUILDING YOUR PLAN</Text>
            <Text style={styles.timer}>{formatElapsed(elapsedMs)}</Text>

            <View style={styles.memberCard}>
              {member.id === "kyla" ? <KylaPortrait size={84} /> : <TeamAvatar look={member.look} size={84} />}
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberTitle}>{member.title.toUpperCase()}</Text>
              <Text style={styles.memberDuty}>{member.duty}</Text>
            </View>

            {/* A finished phase is real, readable plan. Elena writes them in
                order, so the first is done long before the last and a man
                can start reading instead of watching a spinner. The ticker
                below stays for the phase still being written. */}
            {draftedPlanPhases.map((phase: WardrobePlan["phases"][number], i: number) => (
              <View key={`phase-${i}`} style={styles.readyPhase}>
                <Text style={styles.readyPhaseTiming}>
                  {(phase.timingLabel ?? "").toUpperCase()}
                  {i === 0 ? "  ·  READY TO READ" : ""}
                </Text>
                <Text style={styles.readyPhaseName}>{phase.name}</Text>
                {phase.goal ? <Text style={styles.readyPhaseGoal}>{phase.goal}</Text> : null}
                {(phase.items ?? []).map((item: WardrobePlan["phases"][number]["items"][number], j: number) => (
                  <Text key={j} style={styles.readyPhaseItem}>
                    • {item.quantity > 1 ? `${item.quantity}× ` : ""}
                    {item.itemName ?? item.category}
                    {Number(item.estimatedBudgetHighUsd) > 0
                      ? `  $${Math.round(Number(item.estimatedBudgetLowUsd))}–${Math.round(Number(item.estimatedBudgetHighUsd))}`
                      : ""}
                  </Text>
                ))}
              </View>
            ))}

            {draftedPhases.length > draftedPlanPhases.length ? (
              <View style={styles.draftBox}>
                <Text style={styles.draftLabel}>
                  STILL WRITING: {draftedPhases.length} {draftedPhases.length === 1 ? "PIECE" : "PIECES"} IN
                </Text>
                {draftedPhases.slice(-4).map((name, i) => (
                  <Text key={i} style={styles.draftLine}>
                    ✓ {name}
                  </Text>
                ))}
              </View>
            ) : null}

            <Pressable style={styles.waitCard} onPress={() => setCardIndex((i) => i + 1)}>
              {deck[cardIndex % deck.length].kind === "tip" ? (
                <View style={styles.waitCardHeader}>
                  <KylaPortrait size={26} />
                  <Text style={styles.waitCardTitle}>{deck[cardIndex % deck.length].title}</Text>
                </View>
              ) : (
                <Text style={styles.waitCardTitle}>🏬 {deck[cardIndex % deck.length].title}</Text>
              )}
              <Text style={styles.waitCardText}>{deck[cardIndex % deck.length].text}</Text>
              <Text style={styles.waitCardHint}>tap for another</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bayou, justifyContent: "center" },
  content: { alignItems: "center", gap: spacing.lg, padding: spacing.lg },
  stage: { color: colors.gold, fontSize: 12, fontWeight: "800", letterSpacing: 1.5, textAlign: "center" },
  timer: { color: colors.cream, fontSize: 26, fontWeight: "800", fontVariant: ["tabular-nums"], textAlign: "center" },
  memberCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    alignSelf: "stretch",
  },
  memberName: { color: colors.cream, fontSize: 20, fontWeight: "800", marginTop: spacing.sm },
  memberTitle: { color: colors.gold, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  memberDuty: { ...typography.body, color: colors.cream, opacity: 0.9, textAlign: "center", marginTop: spacing.xs },
  valueLine: { ...typography.small, color: colors.cream, opacity: 0.65, textAlign: "center", paddingHorizontal: spacing.md },
  readyPhase: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 3,
  },
  readyPhaseTiming: { ...typography.small, color: colors.gold, fontSize: 10, letterSpacing: 1, fontWeight: "700" },
  readyPhaseName: { ...typography.title, color: colors.cream, fontSize: 16 },
  readyPhaseGoal: { ...typography.small, color: colors.cream, opacity: 0.8, marginBottom: 4 },
  readyPhaseItem: { ...typography.small, color: colors.cream, opacity: 0.95, fontSize: 12, lineHeight: 18 },
  draftBox: { alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: radii.md, padding: spacing.md, gap: 4 },
  draftLabel: { color: colors.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 2 },
  draftLine: { ...typography.small, color: colors.cream, opacity: 0.9 },
  waitCard: {
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 6,
  },
  waitCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  waitCardTitle: { color: colors.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  waitCardText: { ...typography.body, color: colors.cream, fontSize: 14, lineHeight: 20 },
  waitCardHint: { color: colors.cream, opacity: 0.4, fontSize: 10, textAlign: "right" },
  error: { color: "#FFD9CE", textAlign: "center", fontSize: 16 },
  retry: { color: colors.gold, textAlign: "center", marginTop: spacing.md, fontWeight: "700" },
});
