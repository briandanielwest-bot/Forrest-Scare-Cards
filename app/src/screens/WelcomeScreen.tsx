import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppContext } from "../context/AppContext";
import { fetchStores, restoreMemory, startInterview } from "../api/client";
import { colors, radii, spacing, typography } from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

import { KylaPortrait } from "../components/KylaPortrait";
import { TeamAvatar } from "../components/TeamAvatar";
import { AskConcierge } from "../components/AskConcierge";
import { TEAM } from "../data/team";

type InterviewOpener = Awaited<ReturnType<typeof startInterview>>;

export function WelcomeScreen({ navigation }: Props) {
  const {
    stores,
    setSessionId,
    setStores,
    setCategoryLabels,
    setChatMessages,
    setStyleProfile,
    setInterviewDone,
    setWardrobePlan,
    setPurchasedKeys,
    setMemoryCode,
  } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeDraft, setCodeDraft] = useState("");
  const [restoring, setRestoring] = useState(false);

  async function handleRestore() {
    const code = codeDraft.trim();
    if (!code || restoring) return;
    setError(null);
    setRestoring(true);
    try {
      const restored = await restoreMemory(code);
      setSessionId(restored.sessionId);
      setStyleProfile(restored.profile ?? null);
      setWardrobePlan(restored.plan);
      setPurchasedKeys(restored.purchasedKeys ?? []);
      setMemoryCode(restored.code);
      setInterviewDone(true);
      navigation.navigate("Plan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't find that code.");
    } finally {
      setRestoring(false);
    }
  }
  // Kyla's opening message takes a real model call (~4-5s). Kicking it off
  // while he's still reading this screen makes "Meet Kyla" open instantly.
  const prefetchRef = React.useRef<Promise<InterviewOpener | null> | null>(null);

  useEffect(() => {
    prefetchRef.current = startInterview().catch(() => null);
  }, []);

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
      // Use the prefetched opener when it landed; fall back to a fresh
      // call if the prefetch failed (each is consumed exactly once).
      const prefetched = prefetchRef.current ? await prefetchRef.current : null;
      prefetchRef.current = null;
      const { sessionId, reply, quickReplies } = prefetched ?? (await startInterview());
      // Clears any profile/interviewDone left over from a restored session
      // (e.g. the app was killed after the interview but before a plan was
      // generated) so this fresh interview isn't mistaken for a finished one.
      setStyleProfile(null);
      setInterviewDone(false);
      setSessionId(sessionId);
      setChatMessages([{ id: "opening", role: "assistant", text: reply, quickReplies }]);
      navigation.navigate("Interview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reach the server. Is it running?");
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
          <View style={styles.heroKylaRow}>
            <KylaPortrait size={64} />
            <View style={styles.heroKylaTextWrap}>
              <Text style={styles.heroKylaName}>Kyla, your Lead Stylist</Text>
              <Text style={styles.heroKylaLine}>
                "Give me ten minutes of straight answers and I'll hand you the whole rebuild. What to buy, what it
                costs, which Houston store has it, and the week to go in."
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            50 Houston shops we've researched store by store, from the Galleria designer floors to the shirtmaker on
            Richmond cutting paper patterns since 1883. We know the brands they carry, what things run, and the lead
            times.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What you walk out with</Text>
          <Bullet text="A rebuild in phases, priced in real dollars against your budget, down to the alterations line." />
          <Bullet text="Dates. Which piece to buy in week one, and what waits for the January markdowns." />
          <Bullet text="Stores by name. Suitsupply for the navy suit, QC Tailors for the jackets already in your closet." />
          <Bullet text="Fabrics that survive August. Half-lined jackets and high-twist wool, because you park in a garage and walk two blocks." />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How it goes</Text>
          <Step
            number="1"
            text="Kyla interviews you. What you do all day, where in Houston you live, what you hate about your closet, and what you want people to think when you walk in. She pushes back when you go vague."
          />
          <Step
            number="2"
            text="Optional: send Theo your photos. He spent a decade fitting men who never fit a standard size, and he reads shoulder slope and torso length off a photo. Every recommendation after that gets sharper."
          />
          <Step
            number="3"
            text="Vinh, Simone, Ade and Priya work their categories: tailoring, designer floors, footwear, accessories. Elena takes their picks and builds one phased plan your budget can carry."
          />
        </View>

        <View style={styles.freeSection}>
          <Text style={styles.freeSectionTitle}>Free, right now</Text>
          <Text style={styles.freeSectionSub}>No interview, no sign-up. Take what's useful and go.</Text>

          <Pressable style={styles.staplesCard} onPress={() => navigation.navigate("Staples")}>
            <Text style={styles.staplesKicker}>KYLA'S PICKS</Text>
            <Text style={styles.staplesTitle}>Starter Staples</Text>
            <Text style={styles.staplesText}>
              Pick your industry and where you are in your career. Kyla names the two pieces she'd have you buy
              first, where to get them, and what they run. Nothing to fill out.
            </Text>
            <Text style={styles.staplesLink}>Browse the staples →</Text>
          </Pressable>

          <AskConcierge />
        </View>

        <View style={styles.teamCard}>
          <Text style={styles.teamTitle}>Meet the team</Text>
          {/* A row each rather than a grid of name pills: the point of this
              section is where they learned the job and what they do on your
              plan, and neither of those fits under a portrait. */}
          {TEAM.map((member) => (
            <View key={member.id} style={styles.teamMember}>
              {member.id === "kyla" ? <KylaPortrait size={52} /> : <TeamAvatar look={member.look} size={52} />}
              <View style={styles.teamMemberText}>
                <Text style={styles.teamMemberName}>
                  {member.name} <Text style={styles.teamMemberRole}>· {member.title}</Text>
                </Text>
                <Text style={styles.teamMemberLine}>
                  <Text style={styles.teamMemberLabel}>Does </Text>
                  {member.does}
                </Text>
                <Text style={styles.teamMemberLine}>
                  <Text style={styles.teamMemberLabel}>Likes </Text>
                  {member.likes}
                </Text>
              </View>
            </View>
          ))}
          <Text style={styles.teamDisclaimer}>
            Kyla and the team are characters, not real people, and their portraits are illustrations rather than
            likenesses of anyone.
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

        {showCodeInput ? (
          <View style={styles.codeRow}>
            <TextInput
              style={styles.codeInput}
              value={codeDraft}
              onChangeText={setCodeDraft}
              placeholder="BB-XXXX-XXXX"
              placeholderTextColor="rgba(255,255,255,0.4)"
              autoCapitalize="characters"
              editable={!restoring}
              onSubmitEditing={handleRestore}
            />
            <Pressable style={styles.codeButton} onPress={handleRestore} disabled={restoring || !codeDraft.trim()}>
              {restoring ? <ActivityIndicator color={colors.bayouDark} size="small" /> : <Text style={styles.codeButtonText}>Restore</Text>}
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setShowCodeInput(true)}>
            <Text style={styles.link}>Have a claim code? Restore your plan</Text>
          </Pressable>
        )}
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
  heroKylaRow: { flexDirection: "row", gap: spacing.md, alignItems: "center", marginBottom: spacing.md },
  heroKylaTextWrap: { flex: 1 },
  heroKylaName: { color: colors.gold, fontWeight: "800", fontSize: 14, marginBottom: 2 },
  heroKylaLine: { color: colors.cream, fontSize: 14, lineHeight: 20, fontStyle: "italic" },
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
  freeSection: { gap: spacing.sm, marginBottom: spacing.sm },
  freeSectionTitle: { ...typography.title, fontSize: 20, color: colors.cream },
  freeSectionSub: { ...typography.small, color: colors.cream, opacity: 0.75, marginTop: -4, marginBottom: 2 },
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
  teamMember: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", marginTop: spacing.sm },
  teamMemberText: { flex: 1, gap: 2 },
  teamMemberName: { color: colors.gold, fontWeight: "700", fontSize: 14 },
  teamMemberRole: { color: colors.cream, opacity: 0.7, fontWeight: "500", fontSize: 12 },
  teamMemberLine: { color: colors.cream, opacity: 0.88, fontSize: 12, lineHeight: 17 },
  teamMemberLabel: { color: colors.gold, fontWeight: "700" },
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
  codeRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, alignItems: "center" },
  codeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.cream,
    fontWeight: "700",
    letterSpacing: 1,
  },
  codeButton: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 84,
    alignItems: "center",
  },
  codeButtonText: { color: colors.bayouDark, fontWeight: "800" },
  error: { color: "#FFD9CE", textAlign: "center", marginBottom: spacing.sm },
});
