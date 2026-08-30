import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppContext } from "../context/AppContext";
import { generatePlan } from "../api/client";
import { colors, spacing, typography } from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "GeneratingPlan">;

const STATUS_LINES = [
  "Tex is handing your profile to the store scouts…",
  "The Ranch Hand is checking boots and Western wear…",
  "The Floor is scanning the Galleria's designer racks…",
  "The Cutter is lining up bespoke tailors…",
  "The Almanac is factoring in Houston's humidity…",
  "The Closet Architect is building your phased plan…",
];

export function GeneratingPlanScreen({ navigation }: Props) {
  const { sessionId, setWardrobePlan } = useAppContext();
  const [error, setError] = useState<string | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_LINES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    generatePlan(sessionId)
      .then(({ plan }) => {
        if (cancelled) return;
        setWardrobePlan(plan);
        navigation.replace("Plan");
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "The agents hit a snag building your plan.");
      });

    return () => {
      cancelled = true;
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
