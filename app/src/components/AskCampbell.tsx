import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { askCampbell } from "../api/client";
import { TeamAvatar } from "./TeamAvatar";
import { TEAM } from "../data/team";
import { eventsForNow } from "../data/houstonEvents";
import { colors, radii, spacing, typography } from "../theme/theme";

const campbellLook = TEAM.find((m) => m.id === "campbell")!.look;

// Campbell, the Houston Concierge: dress codes, seasons, and above all
// what to wear to a specific Houston event.
//
// He could always answer this; the card just never said so. A text box is
// a search box, and a search box only serves a man who already knows what
// to type. The event chips are the feature announcing itself, ordered so
// what's actually on the calendar comes first.
export function AskCampbell() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [asked, setAsked] = useState<string | null>(null);
  const events = React.useMemo(() => eventsForNow(), []);

  async function ask(raw: string) {
    const q = raw.trim();
    if (!q || asking) return;
    setAsking(true);
    setAnswer(null);
    setAsked(q);
    try {
      const { reply } = await askCampbell(q);
      setAnswer(reply);
    } catch {
      setAnswer("Campbell's line is busy, try again in a minute.");
    } finally {
      setAsking(false);
    }
  }

  const handleAsk = () => ask(question);

  return (
    <View style={styles.campbellCard}>
      <View style={styles.campbellHeader}>
        <TeamAvatar look={campbellLook} size={34} />
        <View style={styles.campbellHeaderText}>
          <Text style={styles.campbellTitle}>What do I wear to…</Text>
          <Text style={styles.campbellSub}>
            Campbell knows every Houston venue and what that room actually wears. Tap one or ask your own.
          </Text>
        </View>
      </View>

      <View style={styles.eventChipRow}>
        {events.map((e) => (
          <Pressable
            key={e.label}
            style={({ pressed }) => [styles.eventChip, pressed && styles.eventChipPressed]}
            onPress={() => ask(e.question)}
            disabled={asking}
          >
            <Text style={styles.eventChipText}>{e.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.campbellRow}>
        <TextInput
          style={styles.campbellInput}
          value={question}
          onChangeText={setQuestion}
          placeholder="Or type any Houston event…"
          placeholderTextColor={colors.muted}
          editable={!asking}
          onSubmitEditing={handleAsk}
        />
        <Pressable style={styles.campbellButton} onPress={handleAsk} disabled={asking || !question.trim()}>
          {asking ? <ActivityIndicator color={colors.cream} size="small" /> : <Text style={styles.campbellButtonText}>Ask</Text>}
        </Pressable>
      </View>

      {/* Echo the question a chip sent, so an answer that arrives after a
          scroll still says what it is answering. */}
      {asked && (answer || asking) ? <Text style={styles.campbellAsked}>{asked}</Text> : null}
      {asking ? <Text style={styles.campbellSub}>Campbell's checking the calendar…</Text> : null}
      {answer ? <Text style={styles.campbellAnswer}>{answer}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  campbellCard: {
    backgroundColor: colors.paper,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.bayou,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  campbellHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  campbellHeaderText: { flex: 1 },
  eventChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  eventChip: {
    borderWidth: 1,
    borderColor: colors.bayou,
    borderRadius: radii.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.cream,
  },
  eventChipPressed: { backgroundColor: colors.bayou },
  eventChipText: { ...typography.small, color: colors.bayouDark, fontWeight: "600" },
  campbellAsked: { ...typography.small, color: colors.bayouDark, fontWeight: "700" },
  campbellTitle: { ...typography.title, fontSize: 16 },
  campbellSub: { ...typography.small, color: colors.muted },
  campbellRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  campbellInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...typography.body,
    fontSize: 14,
  },
  campbellButton: {
    backgroundColor: colors.bayou,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 56,
    alignItems: "center",
  },
  campbellButtonText: { color: colors.cream, fontWeight: "800" },
  campbellAnswer: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.ink },
});
