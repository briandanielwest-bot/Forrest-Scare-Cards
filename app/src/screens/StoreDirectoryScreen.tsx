import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppContext } from "../context/AppContext";
import { fetchStores } from "../api/client";
import { colors, radii, spacing, typography } from "../theme/theme";
import type { HoustonStore, StoreCategory } from "../types";

function formatWebsite(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function StoreDirectoryScreen() {
  const { stores, setStores, categoryLabels, setCategoryLabels } = useAppContext();
  const [loading, setLoading] = useState(stores.length === 0);
  const [error, setError] = useState<string | null>(null);

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
    const byCategory = new Map<StoreCategory, HoustonStore[]>();
    for (const store of stores) {
      const list = byCategory.get(store.category) ?? [];
      list.push(store);
      byCategory.set(store.category, list);
    }
    return Array.from(byCategory.entries()).map(([category, data]) => ({
      title: categoryLabels?.[category] ?? category,
      data,
    }));
  }, [stores, categoryLabels]);

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
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.storeName}>{item.name}</Text>
              <Text style={styles.priceTier}>{item.priceTier}</Text>
            </View>
            <Text style={styles.neighborhood}>{item.neighborhood}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.bestFor}>Best for: {item.bestFor}</Text>
            <Text style={styles.howToBuy}>How to buy: {item.howToBuy}</Text>
            {item.website ? (
              <Pressable onPress={() => Linking.openURL(item.website)} hitSlop={8}>
                <Text style={styles.website}>{formatWebsite(item.website)} →</Text>
              </Pressable>
            ) : null}
          </View>
        )}
        ListFooterComponent={
          <Text style={styles.disclaimer}>
            Seed directory researched via live web search, not a real-time feed — always confirm current hours,
            address, and inventory on the store's own site before visiting.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
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
  bestFor: { ...typography.small, fontWeight: "700" },
  howToBuy: { ...typography.small },
  website: { ...typography.small, color: colors.bayou, fontWeight: "700", marginTop: 2 },
  disclaimer: { ...typography.small, textAlign: "center", marginTop: spacing.lg, marginBottom: spacing.xl },
});
