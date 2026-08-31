import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppContext } from "../context/AppContext";
import { getPlanStatus, startPlanGeneration } from "../api/client";
import { colors, spacing, typography } from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "GeneratingPlan">;

// Each line pairs the agent's namesake Houston sports legend with the
// actual job that agent is doing right now (fan homage — see WelcomeScreen).
const STATUS_LINES = [
  "Kyla is walking your profile into the war room…",
  "Watt is still breaking down your photos like Thursday-night film…",
  "Olajuwon is giving your shoe game the Dream Shake…",
  "Drexler is gliding through the Galleria's designer floors…",
  "Biggio is grinding through Houston's custom tailors, ready for anything…",
  "Wagner is coming out of the bullpen to close out your accessories…",
  "Campbell is powering your plan straight through Houston's humidity…",
  "Moon is reading the field and calling your full wardrobe game plan…",
];

const POLL_INTERVAL_MS = 3000;
// Six agents with full store knowledge take a while on a rich profile —
// observed real generations run past 4 minutes, so the cutoff sits at 6.
const MAX_POLL_MS = 6 * 60 * 1000;

export function GeneratingPlanScreen({ navigation }: Props) {
  const { sessionId, setWardrobePlan } = useAppContext();
  const [error, setError] = useState<string | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_LINES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const result = await getPlanStatus(sessionId!);
        if (cancelled) return;

        if (result.status === "done" && result.plan) {
          setWardrobePlan(result.plan);
          navigation.replace("Plan");
          return;
        }
        if (result.status === "error") {
          setError(result.error ?? "The agents hit a snag building your plan.");
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
            <Text style={styles.status}>{STATUS_LINES[statusIndex]}</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bayou, justifyContent: "center" },
  content: { alignItems: "center", gap: spacing.lg, padding: spacing.lg },
  status: { ...typography.body, color: colors.cream, textAlign: "center" },
  error: { color: "#FFD9CE", textAlign: "center", fontSize: 16 },
  retry: { color: colors.gold, textAlign: "center", marginTop: spacing.md, fontWeight: "700" },
});
