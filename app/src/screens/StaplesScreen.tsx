import React, { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { STARTER_STAPLES, STAPLES_DISCLAIMER, type Staple } from "../data/starterStaples";
import { colors, radii, spacing, typography } from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Staples">;

export function StaplesScreen({ navigation }: Props) {
  const [industryId, setIndustryId] = useState(STARTER_STAPLES[0].id);
  const industry = STARTER_STAPLES.find((i) => i.id === industryId) ?? STARTER_STAPLES[0];

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lede}>
          Pick your industry and where you are in your career. Kyla names the two pieces she'd march you out to buy
          first, on the house.
        </Text>

        <View style={styles.chipRow}>
          {STARTER_STAPLES.map((ind) => (
            <Pressable
              key={ind.id}
              style={[styles.chip, ind.id === industryId && styles.chipActive]}
              onPress={() => setIndustryId(ind.id)}
            >
              <Text style={[styles.chipText, ind.id === industryId && styles.chipTextActive]}>
                {ind.emojiTag} {ind.industry}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.hook}>{industry.hook}</Text>

        {industry.levels.map((level) => (
          <View key={level.level} style={styles.levelCard}>
            <Text style={styles.levelTag}>{level.levelTag}</Text>
            <Text style={styles.levelName}>{level.level}</Text>
            <Text style={styles.levelIntro}>{level.intro}</Text>
            {level.staples.map((staple) => (
              <StapleRow key={staple.item} staple={staple} />
            ))}
          </View>
        ))}

        <Text style={styles.disclaimer}>{STAPLES_DISCLAIMER}</Text>

        <Pressable style={styles.ctaButton} onPress={() => navigation.navigate("Welcome")}>
          <Text style={styles.ctaText}>Want the other 12 items? Meet Kyla →</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StapleRow({ staple }: { staple: Staple }) {
  return (
    <View style={styles.staple}>
      <View style={styles.stapleHeader}>
        <Text style={styles.stapleItem}>{staple.item}</Text>
        <Text style={styles.staplePrice}>{staple.priceRange}</Text>
      </View>
      <Pressable onPress={() => Linking.openURL(staple.storeWebsite)} hitSlop={6}>
        <Text style={styles.stapleStore}>@ {staple.store} →</Text>
      </Pressable>
      <Text style={styles.whyStore}>{staple.whyThisStore}</Text>
      <View style={styles.kylaBubble}>
        <Text style={styles.kylaText}>Kyla: “{staple.kylaSays}”</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, gap: spacing.md },
  lede: { ...typography.body, color: colors.muted },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: { backgroundColor: colors.bayou, borderColor: colors.bayou },
  chipText: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: colors.cream },
  hook: { ...typography.body, fontStyle: "italic", color: colors.bayouDark },
  levelCard: {
    backgroundColor: colors.paper,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  levelTag: { ...typography.small, color: colors.gold, letterSpacing: 1, fontWeight: "800" },
  levelName: { ...typography.title },
  levelIntro: { ...typography.body, color: colors.muted },
  staple: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 4 },
  stapleHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  stapleItem: { ...typography.subtitle, color: colors.ink, flexShrink: 1 },
  staplePrice: { color: colors.bayou, fontWeight: "800" },
  stapleStore: { color: colors.bayou, fontWeight: "700", textDecorationLine: "underline", fontSize: 13 },
  whyStore: { ...typography.small },
  kylaBubble: {
    backgroundColor: colors.cream,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: spacing.sm,
    marginTop: 2,
  },
  kylaText: { ...typography.small, color: colors.bayouDark, fontStyle: "italic" },
  disclaimer: { ...typography.small, textAlign: "center" },
  ctaButton: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  ctaText: { color: colors.bayouDark, fontWeight: "800", fontSize: 15 },
});
