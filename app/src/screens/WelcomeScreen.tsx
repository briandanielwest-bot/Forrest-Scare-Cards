import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppContext } from "../context/AppContext";
import { fetchStores, startInterview } from "../api/client";
import { colors, radii, spacing, typography } from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  const { stores, setSessionId, setStores, setCategoryLabels, setChatMessages, setStyleProfile, setInterviewDone } =
    useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stores.length > 0) return;
    fetchStores()
      .then(({ stores, categoryLabels }) => {
        setStores(stores);
        setCategoryLabels(categoryLabels);
      })
      .catch(() => {
        // Store directory can load later from its own screen; don't block welcome.
      });
  }, [stores.length]);

  async function handleStart() {
    setError(null);
    setLoading(true);
    try {
      const { sessionId, reply } = await startInterview();
      // Clears any profile/interviewDone left over from a restored session
      // (e.g. the app was killed after the interview but before a plan was
      // generated) so this fresh interview isn't mistaken for a finished one.
      setStyleProfile(null);
      setInterviewDone(false);
      setSessionId(sessionId);
      setChatMessages([{ id: "opening", role: "assistant", text: reply }]);
      navigation.navigate("Interview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reach the server — is it running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>HOUSTON, TX</Text>
        <Text style={styles.title}>Bayou & Blazer</Text>
        <Text style={styles.subtitle}>
          The ultimate high-end Houston men's style guide — built by AI agents who know the shops, the weather,
          and exactly what looks good on you.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Here's how it works</Text>
        <Step number="1" text="Chat with Tex — a fun, sharp interviewer who nails your style and budget." />
        <Step number="2" text="Show The Eye your photos so it can call your fit, color, and current look." />
        <Step number="3" text="Our Houston store scouts and The Closet Architect build your full wardrobe plan." />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        onPress={handleStart}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color={colors.cream} /> : <Text style={styles.primaryButtonText}>Meet Tex →</Text>}
      </Pressable>

      <Pressable onPress={() => navigation.navigate("StoreDirectory")}>
        <Text style={styles.link}>Browse the Houston store directory</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bayou, padding: spacing.lg, justifyContent: "space-between" },
  hero: { marginTop: spacing.xl },
  kicker: { color: colors.gold, letterSpacing: 2, fontWeight: "700", fontSize: 12, marginBottom: spacing.sm },
  title: { color: colors.cream, fontSize: 40, fontWeight: "800", marginBottom: spacing.md },
  subtitle: { color: colors.cream, opacity: 0.85, fontSize: 16, lineHeight: 23 },
  card: {
    backgroundColor: colors.paper,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: { ...typography.title, marginBottom: spacing.xs },
  step: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.bayou,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: { color: colors.cream, fontWeight: "700", fontSize: 12 },
  stepText: { ...typography.body, flex: 1 },
  primaryButton: {
    backgroundColor: colors.gold,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  pressed: { opacity: 0.85 },
  primaryButtonText: { color: colors.bayouDark, fontWeight: "800", fontSize: 17 },
  link: { color: colors.cream, textAlign: "center", marginTop: spacing.md, textDecorationLine: "underline" },
  error: { color: "#FFD9CE", textAlign: "center", marginTop: spacing.sm },
});
