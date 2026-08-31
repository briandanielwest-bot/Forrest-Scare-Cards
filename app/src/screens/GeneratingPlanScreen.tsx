import React, { useEffect, useMemo, useRef, useState } from "react";
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

const POLL_INTERVAL_MS = 3000;
// Long enough to read a name, a title, and a duty line without rushing —
// the wait is where the app shows the actual work being done for him.
const ROTATE_INTERVAL_MS = 5000;
// Six agents with full store knowledge take a while on a rich profile —
// observed real generations run past 4 minutes, so the cutoff sits at 6.
const MAX_POLL_MS = 6 * 60 * 1000;

const STAGE_CAPTION: Record<string, string> = {
  warmup: "YOUR TEAM IS GETTING BRIEFED",
  scouts: "YOUR BUYING TEAM IS ON THE FLOOR",
  planner: "MOON IS WRITING YOUR PLAN — THE LONG PART",
};

export function GeneratingPlanScreen({ navigation }: Props) {
  const { sessionId, setWardrobePlan } = useAppContext();
  const [error, setError] = useState<string | null>(null);
  const [memberIndex, setMemberIndex] = useState(0);
  const [stage, setStage] = useState<"scouts" | "planner" | undefined>(undefined);
  const startedAtRef = useRef(Date.now());

  // Spotlight the people actually working right now: the buying directors
  // while the scouts run, Moon (with Kyla checking his work) once the
  // planner takes over, everyone during warm-up.
  const activeMembers = useMemo(() => {
    if (stage === "planner") return TEAM.filter((m) => m.id === "moon" || m.id === "kyla");
    if (stage === "scouts") return TEAM.filter((m) => m.stage === "scouts" || m.id === "watt");
    return TEAM;
  }, [stage]);

  useEffect(() => {
    setMemberIndex(0);
    const interval = setInterval(() => {
      setMemberIndex((i) => (i + 1) % activeMembers.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeMembers]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const result = await getPlanStatus(sessionId!);
        if (cancelled) return;
        setStage(result.stage);

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
          setError("This is taking much longer than expected — the server may be overloaded. Try again in a bit.");
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

  const member = activeMembers[memberIndex % activeMembers.length];
  const caption = stage === "planner" ? STAGE_CAPTION.planner : stage === "scouts" ? STAGE_CAPTION.scouts : STAGE_CAPTION.warmup;

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
            <Text style={styles.stage}>{caption}</Text>

            <View style={styles.memberCard}>
              {member.id === "kyla" ? <KylaPortrait size={84} /> : <TeamAvatar look={member.look} size={84} />}
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberTitle}>{member.title.toUpperCase()}</Text>
              <Text style={styles.memberDuty}>{member.duty}</Text>
            </View>

            <Text style={styles.valueLine}>
              A real team pass takes a few minutes — 40+ vetted Houston stores, your budget, your build, and your
              calendar, checked piece by piece.
            </Text>
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
  error: { color: "#FFD9CE", textAlign: "center", fontSize: 16 },
  retry: { color: colors.gold, textAlign: "center", marginTop: spacing.md, fontWeight: "700" },
});
