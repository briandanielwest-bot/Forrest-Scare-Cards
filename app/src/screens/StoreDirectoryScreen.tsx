import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, SectionList, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppContext } from "../context/AppContext";
import { askCampbell, fetchStores } from "../api/client";
import { TeamAvatar } from "../components/TeamAvatar";
import { TEAM } from "../data/team";
import { colors, radii, spacing, typography } from "../theme/theme";
import type { HoustonStore, StoreCategory } from "../types";

// Domain only — full URLs with paths overflow the card on phone widths.
function formatWebsite(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
}

function telUrl(contact: string): string | null {
  const digits = contact.replace(/[^\d]/g, "");
  return digits.length >= 10 ? `tel:+1${digits.slice(-10)}` : null;
}

function mapsUrl(store: { name: string; neighborhood: string }): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store.name} ${store.neighborhood} Houston TX`)}`;
}

const campbellLook = TEAM.find((m) => m.id === "campbell")!.look;

// One-question box answered by Campbell, the Houston Concierge — dress
// codes, seasons, events ("what do I wear to a Rodeo gala?").
function AskCampbell() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  async function handleAsk() {
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setAnswer(null);
    try {
      const { reply } = await askCampbell(q);
      setAnswer(reply);
    } catch {
      setAnswer("Campbell's line is busy — try again in a minute.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <View style={styles.campbellCard}>
      <View style={styles.campbellHeader}>
        <TeamAvatar look={campbellLook} size={34} />
        <View>
          <Text style={styles.campbellTitle}>Ask Campbell</Text>
          <Text style={styles.campbellSub}>Houston dress codes, seasons, events — he's the concierge.</Text>
        </View>
      </View>
      <View style={styles.campbellRow}>
        <TextInput
          style={styles.campbellInput}
          value={question}
          onChangeText={setQuestion}
          placeholder="What do I wear to a Rodeo gala?"
          placeholderTextColor={colors.muted}
          editable={!asking}
          onSubmitEditing={handleAsk}
        />
        <Pressable style={styles.campbellButton} onPress={handleAsk} disabled={asking || !question.trim()}>
          {asking ? <ActivityIndicator color={colors.cream} size="small" /> : <Text style={styles.campbellButtonText}>Ask</Text>}
        </Pressable>
      </View>
      {answer ? <Text style={styles.campbellAnswer}>{answer}</Text> : null}
    </View>
  );
}

export function StoreDirectoryScreen() {
  const { stores, setStores, categoryLabels, setCategoryLabels } = useAppContext();
  const [loading, setLoading] = useState(stores.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (stores.length > 0) return;
    fetchStores()
      .then((data) => {
        setStores(data.stores);
        setCategoryLabels(data.categoryLabels);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load the directory."))
      .finally(() => setLoading(false));
  }, []);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = q
      ? stores.filter((s) =>
          [s.name, s.neighborhood, s.description, s.bestFor, s.knownFor ?? "", s.catersTo ?? "", ...s.styleTags]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : stores;
    const byCategory = new Map<StoreCategory, HoustonStore[]>();
    for (const store of visible) {
      const list = byCategory.get(store.category) ?? [];
      list.push(store);
      byCategory.set(store.category, list);
    }
    return Array.from(byCategory.entries()).map(([category, data]) => ({
      title: categoryLabels?.[category] ?? category,
      data,
    }));
  }, [stores, categoryLabels, query]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.bayou} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ color: colors.danger }}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search 40+ stores — try 'boots', 'custom', 'Heights'…"
        placeholderTextColor={colors.muted}
      />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<AskCampbell />}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.storeName}>{item.name}</Text>
              <Text style={styles.priceTier}>{item.priceTier}</Text>
            </View>
            <Text style={styles.neighborhood}>{item.neighborhood}</Text>
            <Text style={styles.description}>{item.description}</Text>
            {item.seasonalNote ? <Text style={styles.seasonalNote}>Right now: {item.seasonalNote}</Text> : null}
            {item.knownFor ? <Text style={styles.knownFor}>Known for: {item.knownFor}</Text> : null}
            {item.catersTo ? <Text style={styles.catersTo}>Caters to: {item.catersTo}</Text> : null}
            <Text style={styles.bestFor}>Best for: {item.bestFor}</Text>
            <Text style={styles.howToBuy}>How to buy: {item.howToBuy}</Text>
            {item.contact ? (
              telUrl(item.contact) ? (
                <Pressable onPress={() => Linking.openURL(telUrl(item.contact!)!)} hitSlop={6}>
                  <Text style={styles.contactLink}>📞 {item.contact}</Text>
                </Pressable>
              ) : (
                <Text style={styles.contact}>Contact: {item.contact}</Text>
              )
            ) : null}
            <View style={styles.linkRow}>
              {item.website ? (
                <Pressable onPress={() => Linking.openURL(item.website)} hitSlop={8} style={styles.linkShrink}>
                  <Text style={styles.website} numberOfLines={1}>
                    {formatWebsite(item.website)} →
                  </Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => Linking.openURL(mapsUrl(item))} hitSlop={8}>
                <Text style={styles.website}>📍 Map</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListFooterComponent={
          <Text style={styles.disclaimer}>
            Directory researched via live web search and re-verified monthly by an AI researcher ("Right now" notes
            come from the latest check) — still confirm hours and inventory on the store's own site before visiting.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  search: {
    margin: spacing.md,
    marginBottom: 0,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  list: { padding: spacing.md, gap: spacing.sm },
  sectionHeader: {
    ...typography.subtitle,
    color: colors.bayou,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  storeName: { ...typography.title, fontSize: 17 },
  priceTier: { color: colors.gold, fontWeight: "800" },
  neighborhood: { ...typography.small },
  description: { ...typography.body },
  seasonalNote: {
    ...typography.small,
    color: colors.bayouDark,
    fontWeight: "700",
    backgroundColor: "#F4E9C9",
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    overflow: "hidden",
  },
  knownFor: { ...typography.small, color: colors.bayou, fontWeight: "700" },
  catersTo: { ...typography.small, fontStyle: "italic" },
  bestFor: { ...typography.small, fontWeight: "700" },
  howToBuy: { ...typography.small },
  contact: { ...typography.small, fontWeight: "700", color: colors.ink },
  contactLink: { ...typography.small, fontWeight: "700", color: colors.bayou },
  linkRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2, gap: spacing.sm },
  linkShrink: { flexShrink: 1 },
  website: { ...typography.small, color: colors.bayou, fontWeight: "700", marginTop: 2 },
  disclaimer: { ...typography.small, textAlign: "center", marginTop: spacing.lg, marginBottom: spacing.xl },
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
