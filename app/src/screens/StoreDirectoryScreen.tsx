import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, SectionList, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppContext } from "../context/AppContext";
import { askCampbell, fetchStores } from "../api/client";
import { TeamAvatar } from "../components/TeamAvatar";
import { TEAM } from "../data/team";
import { eventsForNow } from "../data/houstonEvents";
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

// Storefront and interior photos live with the businesses that own them —
// we link to their public galleries rather than copying the images.
function photosUrl(store: { name: string; neighborhood: string }): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${store.name} ${store.neighborhood} Houston store`)}`;
}

const campbellLook = TEAM.find((m) => m.id === "campbell")!.look;

// Campbell, the Houston Concierge: dress codes, seasons, and above all
// what to wear to a specific Houston event.
//
// He could always answer this; the card just never said so. A text box is
// a search box, and a search box only serves a man who already knows what
// to type. The event chips are the feature announcing itself, ordered so
// what's actually on the calendar comes first.
function AskCampbell() {
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
          [
            s.name,
            s.neighborhood,
            s.description,
            s.bestFor,
            s.knownFor ?? "",
            s.catersTo ?? "",
            s.insiderTake ?? "",
            ...(s.brands ?? []),
            ...s.styleTags,
          ]
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
        placeholder="Search stores or brands: Alden, custom, Heights…"
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
            {item.brands?.length ? (
              <View style={styles.brandRow}>
                {item.brands.slice(0, 8).map((b) => (
                  <Text key={b} style={styles.brandChip}>
                    {b}
                  </Text>
                ))}
              </View>
            ) : null}
            {item.pricePoints?.length ? (
              <View style={styles.priceBlock}>
                {item.pricePoints.slice(0, 4).map((pp) => (
                  <Text key={pp} style={styles.pricePoint}>
                    • {pp}
                  </Text>
                ))}
              </View>
            ) : null}
            {item.insiderTake ? <Text style={styles.insiderTake}>Insider: {item.insiderTake}</Text> : null}
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
              {item.instagram ? (
                <Pressable onPress={() => Linking.openURL(`https://instagram.com/${item.instagram}`)} hitSlop={8}>
                  <Text style={styles.website}>@{item.instagram}</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => Linking.openURL(photosUrl(item))} hitSlop={8}>
                  <Text style={styles.website}>📷 Photos</Text>
                </Pressable>
              )}
              <Pressable onPress={() => Linking.openURL(mapsUrl(item))} hitSlop={8}>
                <Text style={styles.website}>📍 Map</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListFooterComponent={
          <Text style={styles.disclaimer}>
            We research this directory by live web search and re-check it every month. Brands, prices, and "Right
            now" notes come from that research and can go stale without warning. Photos link to each store's own
            public galleries. Call and confirm stock, pricing, and hours before you drive across town.
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
  brandRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  brandChip: {
    ...typography.small,
    fontSize: 11,
    fontWeight: "700",
    color: colors.bayouDark,
    backgroundColor: "#E7EFE8",
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },
  priceBlock: { marginTop: 2, gap: 1 },
  pricePoint: { ...typography.small, color: colors.ink, fontVariant: ["tabular-nums"] },
  insiderTake: {
    ...typography.small,
    color: colors.bayouDark,
    fontStyle: "italic",
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    paddingLeft: 6,
    marginTop: 2,
  },
});
