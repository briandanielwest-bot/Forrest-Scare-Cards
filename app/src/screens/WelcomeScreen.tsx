import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppContext } from "../context/AppContext";
import { fetchStores, startInterview } from "../api/client";
import { colors, radii, spacing, typography } from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

import { TeamAvatar } from "../components/TeamAvatar";
import { TEAM } from "../data/team";

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
      const { sessionId, reply, quickReplies } = await startInterview();
      // Clears any profile/interviewDone left over from a restored session
      // (e.g. the app was killed after the interview but before a plan was
      // generated) so this fresh interview isn't mistaken for a finished one.
      setStyleProfile(null);
      setInterviewDone(false);
      setSessionId(sessionId);
      setChatMessages([{ id: "opening", role: "assistant", text: reply, quickReplies }]);
      navigation.navigate("Interview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reach the server — is it running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>HOUSTON, TX</Text>
          <Text style={styles.title}>Bayou & Blazer</Text>
          <Text style={styles.subtitle}>
            A team of AI stylists that turns one real conversation into a priced, dated, store-by-store wardrobe
            rebuild plan — built specifically for Houston's climate, culture, and shops. Not a quiz. Not generic
            advice. A build-out.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What you walk away with</Text>
          <Bullet text="A phased wardrobe rebuild, priced in real dollars against your actual budget." />
          <Bullet text="A timeline for exactly when to buy each piece — not everything at once." />
          <Bullet text="Specific Houston stores matched to your budget and style, not a generic shopping list." />
          <Bullet text="A plan that accounts for Houston's climate and culture — the AC-vs-August swing, gala season, and (if it's relevant to you) rodeo season." />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Here's how it works</Text>
          <Step
            number="1"
            text="A real conversation with Kyla — not a form. She digs into your style, your budget, what's not working right now, and what you're actually trying to look like."
          />
          <Step
            number="2"
            text="Optional: show Watt your photos — he reads your face shape, body type, fit, and coloring like game film, and it sharpens every recommendation."
          />
          <Step
            number="3"
            text="Your buying directors — tailoring, designer floors, footwear, accessories — and Moon, your head planner, turn all of that into your full, phased rebuild plan."
          />
        </View>

        <Pressable style={styles.staplesCard} onPress={() => navigation.navigate("Staples")}>
          <Text style={styles.staplesKicker}>FREE SAMPLE — NO INTERVIEW REQUIRED</Text>
          <Text style={styles.staplesTitle}>Kyla's Starter Staples</Text>
          <Text style={styles.staplesText}>
            Four Houston industries. Three career levels. The two pieces she'd make you buy first — with the store,
            the price, and exactly why. Tap in, steal freely.
          </Text>
          <Text style={styles.staplesLink}>Browse the staples →</Text>
        </Pressable>

        <View style={styles.teamCard}>
          <Text style={styles.teamTitle}>Meet the team</Text>
          <View style={styles.teamRow}>
            {TEAM.map((member) => (
              <View key={member.id} style={styles.teamPill}>
                <TeamAvatar look={member.look} size={44} />
                <Text style={styles.teamPillName}>{member.name}</Text>
                <Text style={styles.teamPillRole}>{member.title}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.teamDisclaimer}>
            Agent names are a fan homage to Houston sports legends — this app is not affiliated with or endorsed by
            the people they honor.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={handleStart}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={colors.cream} /> : <Text style={styles.primaryButtonText}>Meet Kyla →</Text>}
        </Pressable>

        <Pressable onPress={() => navigation.navigate("StoreDirectory")}>
          <Text style={styles.link}>Browse the Houston store directory</Text>
        </Pressable>
      </View>
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

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletMark}>•</Text>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bayou },
  scrollContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.lg },
  hero: { marginTop: spacing.md, marginBottom: spacing.sm },
  kicker: { color: colors.gold, letterSpacing: 2, fontWeight: "700", fontSize: 12, marginBottom: spacing.sm },
  title: { color: colors.cream, fontSize: 40, fontWeight: "800", marginBottom: spacing.md },
  subtitle: { color: colors.cream, opacity: 0.9, fontSize: 16, lineHeight: 23 },
  card: {
    backgroundColor: colors.paper,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: { ...typography.title, marginBottom: spacing.xs },
  step: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  bulletMark: { color: colors.gold, fontWeight: "800", fontSize: 16, lineHeight: 21 },
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
  staplesCard: {
    backgroundColor: colors.gold,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  staplesKicker: { color: colors.bayouDark, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  staplesTitle: { color: colors.bayouDark, fontSize: 20, fontWeight: "800" },
  staplesText: { color: colors.bayouDark, fontSize: 14, lineHeight: 20 },
  staplesLink: { color: colors.bayouDark, fontWeight: "800", textDecorationLine: "underline", marginTop: 2 },
  teamCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  teamTitle: { color: colors.cream, fontSize: 16, fontWeight: "700" },
  teamRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  teamPill: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    minWidth: "30%",
    flexBasis: "30%",
    flexGrow: 1,
    alignItems: "center",
    gap: 4,
  },
  teamPillName: { color: colors.gold, fontWeight: "700", fontSize: 13, textAlign: "center" },
  teamPillRole: { color: colors.cream, opacity: 0.75, fontSize: 10, marginTop: 1, textAlign: "center" },
  teamDisclaimer: { color: colors.cream, opacity: 0.55, fontSize: 10, lineHeight: 14, marginTop: spacing.xs },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  primaryButton: {
    backgroundColor: colors.gold,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  pressed: { opacity: 0.85 },
  primaryButtonText: { color: colors.bayouDark, fontWeight: "800", fontSize: 17 },
  link: { color: colors.cream, textAlign: "center", marginTop: spacing.md, textDecorationLine: "underline" },
  error: { color: "#FFD9CE", textAlign: "center", marginBottom: spacing.sm },
});
