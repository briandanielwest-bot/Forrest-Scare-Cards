import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppContext } from "../context/AppContext";
import { colors, radii, spacing, typography } from "../theme/theme";
import type { WardrobeItem, StorePriority } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Plan">;

const PRIORITY_COLOR: Record<StorePriority, string> = {
  essential: colors.bayou,
  recommended: colors.gold,
  "nice-to-have": colors.muted,
};

function money(n: number) {
  return `$${n.toLocaleString()}`;
}

export function PlanScreen({ navigation }: Props) {
  const { wardrobePlan, storeById } = useAppContext();

  if (!wardrobePlan) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={typography.body}>No plan yet — head back and finish the interview first.</Text>
      </SafeAreaView>
    );
  }

  const plan = wardrobePlan;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.guideTitle}>{plan.guideTitle}</Text>
        <Text style={styles.narrative}>{plan.introNarrative}</Text>

        <View style={styles.calloutCard}>
          <Text style={styles.calloutLabel}>Houston climate notes</Text>
          <Text style={styles.calloutText}>{plan.climateNotes}</Text>
        </View>

        <View style={styles.budgetCard}>
          <Text style={styles.budgetTotal}>{money(plan.budgetSummary.totalBudgetUsd)} total budget</Text>
          {plan.budgetSummary.perPhaseUsd.map((p) => (
            <View key={p.phaseName} style={styles.budgetRow}>
              <Text style={styles.budgetPhase}>{p.phaseName}</Text>
              <Text style={styles.budgetAmount}>{money(p.amountUsd)}</Text>
            </View>
          ))}
        </View>

        {plan.phases.map((phase) => (
          <View key={phase.name} style={styles.phaseCard}>
            <Text style={styles.phaseTiming}>{phase.timingLabel.toUpperCase()}</Text>
            <Text style={styles.phaseName}>{phase.name}</Text>
            <Text style={styles.phaseGoal}>{phase.goal}</Text>

            {phase.items.map((item, idx) => (
              <ItemRow key={idx} item={item} storeName={(id) => storeById(id)?.name ?? id} />
            ))}
          </View>
        ))}

        <View style={styles.tipsCard}>
          <Text style={styles.calloutLabel}>Buying tips</Text>
          {plan.generalBuyingTips.map((tip, i) => (
            <Text key={i} style={styles.tipText}>
              •  {tip}
            </Text>
          ))}
        </View>

        <View style={styles.pepCard}>
          <Text style={styles.pepText}>{plan.finalPepTalk}</Text>
        </View>

        <Pressable style={styles.directoryButton} onPress={() => navigation.navigate("StoreDirectory")}>
          <Text style={styles.directoryButtonText}>Browse the full Houston store directory</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ItemRow({ item, storeName }: { item: WardrobeItem; storeName: (id: string) => string }) {
  return (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemCategory}>
          {item.quantity > 1 ? `${item.quantity}× ` : ""}
          {item.category}
        </Text>
        <View style={[styles.priorityPill, { backgroundColor: PRIORITY_COLOR[item.priority] }]}>
          <Text style={styles.priorityText}>{item.priority}</Text>
        </View>
      </View>
      <Text style={styles.itemDescription}>{item.description}</Text>
      <Text style={styles.itemBudget}>
        {money(item.estimatedBudgetLowUsd)} – {money(item.estimatedBudgetHighUsd)}
      </Text>
      {item.recommendedStoreIds.length > 0 && (
        <Text style={styles.itemStores}>Where: {item.recommendedStoreIds.map(storeName).join(", ")}</Text>
      )}
      <Text style={styles.itemNotes}>{item.buyingNotes}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, gap: spacing.lg },
  guideTitle: { ...typography.display },
  narrative: { ...typography.body },
  calloutCard: { backgroundColor: colors.paper, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  calloutLabel: { ...typography.subtitle, marginBottom: spacing.xs },
  calloutText: { ...typography.body },
  budgetCard: { backgroundColor: colors.blazerNavy, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs },
  budgetTotal: { color: colors.cream, fontSize: 20, fontWeight: "800", marginBottom: spacing.xs },
  budgetRow: { flexDirection: "row", justifyContent: "space-between" },
  budgetPhase: { color: colors.cream, opacity: 0.85 },
  budgetAmount: { color: colors.gold, fontWeight: "700" },
  phaseCard: { backgroundColor: colors.paper, borderRadius: radii.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  phaseTiming: { ...typography.small, color: colors.gold, letterSpacing: 1 },
  phaseName: { ...typography.title },
  phaseGoal: { ...typography.body, color: colors.muted, marginBottom: spacing.xs },
  item: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 4 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemCategory: { ...typography.subtitle, color: colors.ink },
  priorityPill: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  priorityText: { color: colors.cream, fontSize: 11, fontWeight: "700" },
  itemDescription: { ...typography.body },
  itemBudget: { ...typography.small, color: colors.bayou, fontWeight: "700" },
  itemStores: { ...typography.small },
  itemNotes: { ...typography.small, fontStyle: "italic" },
  tipsCard: { backgroundColor: colors.paper, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  tipText: { ...typography.body },
  pepCard: { backgroundColor: colors.gold, borderRadius: radii.md, padding: spacing.md },
  pepText: { ...typography.body, color: colors.bayouDark, fontWeight: "600" },
  directoryButton: { alignItems: "center", paddingVertical: spacing.md },
  directoryButtonText: { color: colors.bayou, fontWeight: "700", textDecorationLine: "underline" },
});
