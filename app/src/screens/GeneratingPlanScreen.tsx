import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppContext } from "../context/AppContext";
import { getPlanStatus, startPlanGeneration } from "../api/client";
import { KylaPortrait } from "../components/KylaPortrait";
import { TeamAvatar } from "../components/TeamAvatar";
import { TEAM } from "../data/team";
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

export function GeneratingPlanScreen({ navigation }: Props) {
  const { sessionId, setWardrobePlan } = useAppContext();
  const [error, setError] = useState<string | null>(null);
  const [memberIndex, setMemberIndex] = useState(0);
  const [draftedPhases, setDraftedPhases] = useState<string[]>([]);
  const startedAtRef = useRef(Date.now());

  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMemberIndex((i) => (i + 1) % TEAM.length);
    }, ROTATE_INTERVAL_MS);
    const ticker = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(ticker);
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
              "or a rare bad generation triggered an automatic retry. Your interview is saved — tap Try again.",
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

            {draftedPhases.length > 0 ? (
              <View style={styles.draftBox}>
                <Text style={styles.draftLabel}>MOON'S DRAFT, LIVE</Text>
                {draftedPhases.map((name, i) => (
                  <Text key={i} style={styles.draftLine}>
                    ✓ {name}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.valueLine}>
                Usually about a minute. The wait is real work: eight experts reading your profile against 40+ vetted
                Houston stores, matching every piece to your budget, your build, and this city's calendar.
              </Text>
            )}
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
  draftBox: { alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: radii.md, padding: spacing.md, gap: 4 },
  draftLabel: { color: colors.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 2 },
  draftLine: { ...typography.small, color: colors.cream, opacity: 0.9 },
  error: { color: "#FFD9CE", textAlign: "center", fontSize: 16 },
  retry: { color: colors.gold, textAlign: "center", marginTop: spacing.md, fontWeight: "700" },
});
