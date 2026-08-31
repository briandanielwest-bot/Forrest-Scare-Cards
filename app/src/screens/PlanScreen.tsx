import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppContext } from "../context/AppContext";
import { fetchStores } from "../api/client";
import { colors, radii, spacing, typography } from "../theme/theme";
import type { HoustonStore, WardrobeItem, WardrobePlan, StorePriority } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Plan">;

const PRIORITY_COLOR: Record<StorePriority, string> = {
  essential: colors.bayou,
  recommended: colors.gold,
  "nice-to-have": colors.muted,
};

function money(n: number | undefined | null) {
  return `$${(Number(n) || 0).toLocaleString()}`;
}

// The model occasionally writes the literal two-character sequence \n
// inside a free-text field instead of an actual newline (seen live in
// introNarrative) — this turns those back into real line breaks so text
// doesn't render with visible backslash-n in it.
function cleanText(text: string | undefined | null): string {
  return (text ?? "").replace(/\\n/g, "\n");
}

// `?? []` doesn't guard against a field that EXISTS but isn't an array
// (seen live: the model returned phases as a JSON string, crashing .map).
// The server now normalizes that, but the client must never crash on a
// stored plan's shape either way.
function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

interface StoreRun {
  storeId: string;
  store?: HoustonStore;
  items: { label: string; phaseName: string; low: number; high: number }[];
}

// Regroups the plan's items by their primary recommended store, so the
// plan ends with a literal errand list: walk into this store, buy these
// things, here's who to contact.
function buildStoreRuns(plan: WardrobePlan, storeById: (id: string) => HoustonStore | undefined): StoreRun[] {
  const runs = new Map<string, StoreRun>();
  for (const phase of asArray<WardrobePlan["phases"][number]>(plan.phases)) {
    for (const item of asArray<WardrobeItem>(phase.items)) {
      const primary = asArray<string>(item.recommendedStoreIds)[0];
      if (!primary) continue;
      let run = runs.get(primary);
      if (!run) {
        run = { storeId: primary, store: storeById(primary), items: [] };
        runs.set(primary, run);
      }
      run.items.push({
        label: `${item.quantity > 1 ? `${item.quantity}× ` : ""}${item.category}`,
        phaseName: phase.timingLabel || phase.name || "",
        low: Number(item.estimatedBudgetLowUsd) || 0,
        high: Number(item.estimatedBudgetHighUsd) || 0,
      });
    }
  }
  // Biggest runs first — the store he'll spend the most time in leads.
  return Array.from(runs.values()).sort((a, b) => b.items.length - a.items.length);
}

export function PlanScreen({ navigation }: Props) {
  const { wardrobePlan, stores, setStores, setCategoryLabels, storeById, resetSession } = useAppContext();

  // On a cold app restore, the persisted plan can land here before the
  // store directory has ever been fetched (that normally happens on the
  // Welcome screen) — without it, store names render as raw ids.
  React.useEffect(() => {
    if (stores.length > 0) return;
    fetchStores()
      .then(({ stores, categoryLabels }) => {
        setStores(stores);
        setCategoryLabels(categoryLabels);
      })
      .catch(() => {
        // Names fall back to ids; nothing else breaks.
      });
  }, [stores.length]);

  function handleStartOver() {
    resetSession();
    navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
  }

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

        <AtAGlance plan={plan} />

        <Text style={styles.narrative}>{cleanText(plan.introNarrative)}</Text>

        <View style={styles.calloutCard}>
          <Text style={styles.calloutLabel}>Houston climate notes</Text>
          <Text style={styles.calloutText}>{cleanText(plan.climateNotes)}</Text>
        </View>

        <View style={styles.budgetCard}>
          <Text style={styles.budgetTotal}>{money(plan.budgetSummary?.totalBudgetUsd)} total budget</Text>
          {asArray<{ phaseName: string; amountUsd: number }>(plan.budgetSummary?.perPhaseUsd).map((p, i) => (
            <View key={p.phaseName ?? i} style={styles.budgetRow}>
              <Text style={styles.budgetPhase}>{p.phaseName ?? "Phase"}</Text>
              <Text style={styles.budgetAmount}>{money(p.amountUsd)}</Text>
            </View>
          ))}
        </View>

        {asArray<WardrobePlan["phases"][number]>(plan.phases).map((phase, i) => (
          <View key={phase.name ?? i} style={styles.phaseCard}>
            <Text style={styles.phaseTiming}>{(phase.timingLabel ?? "").toUpperCase()}</Text>
            <Text style={styles.phaseName}>{phase.name ?? "Phase"}</Text>
            <Text style={styles.phaseGoal}>{cleanText(phase.goal)}</Text>

            {asArray<WardrobeItem>(phase.items).map((item, idx) => (
              <ItemRow key={idx} item={item} storeName={(id) => storeById(id)?.name ?? id} />
            ))}
          </View>
        ))}

        <StoreRunList runs={buildStoreRuns(plan, storeById)} />

        <View style={styles.tipsCard}>
          <Text style={styles.calloutLabel}>Buying tips</Text>
          {asArray<string>(plan.generalBuyingTips).map((tip, i) => (
            <Text key={i} style={styles.tipText}>
              •  {cleanText(tip)}
            </Text>
          ))}
        </View>

        <View style={styles.pepCard}>
          <Text style={styles.pepText}>{cleanText(plan.finalPepTalk)}</Text>
        </View>

        <Pressable style={styles.directoryButton} onPress={() => navigation.navigate("StoreDirectory")}>
          <Text style={styles.directoryButtonText}>Browse the full Houston store directory</Text>
        </Pressable>

        <Pressable style={styles.startOverButton} onPress={handleStartOver}>
          <Text style={styles.startOverText}>Start a new plan</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function AtAGlance({ plan }: { plan: WardrobePlan }) {
  const phases = asArray<WardrobePlan["phases"][number]>(plan.phases);
  const items = phases.flatMap((p) => asArray<WardrobeItem>(p.items));
  const stores = new Set(items.flatMap((i) => asArray<string>(i.recommendedStoreIds)));
  const stats: [string, string][] = [
    [String(phases.length), phases.length === 1 ? "phase" : "phases"],
    [String(items.length), "items"],
    [String(stores.size), "stores"],
    [money(plan.budgetSummary?.totalBudgetUsd), "budget"],
  ];
  return (
    <View style={styles.glanceRow}>
      {stats.map(([value, label]) => (
        <View key={label} style={styles.glanceStat}>
          <Text style={styles.glanceValue}>{value}</Text>
          <Text style={styles.glanceLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function StoreRunList({ runs }: { runs: StoreRun[] }) {
  if (runs.length === 0) return null;
  return (
    <View style={styles.runCard}>
      <Text style={styles.runHeader}>Your store run list</Text>
      <Text style={styles.runSubheader}>
        Every item above, regrouped by store — this is your errand list. Show it at the counter.
      </Text>
      {runs.map((run) => {
        const low = run.items.reduce((sum, it) => sum + it.low, 0);
        const high = run.items.reduce((sum, it) => sum + it.high, 0);
        const name = run.store?.name ?? run.storeId;
        return (
          <View key={run.storeId} style={styles.runStore}>
            <View style={styles.runStoreHeader}>
              <Text style={styles.runStoreName}>{name}</Text>
              <Text style={styles.runStoreBudget}>
                {money(low)} – {money(high)}
              </Text>
            </View>
            {run.store?.neighborhood ? <Text style={styles.runStoreMeta}>{run.store.neighborhood}</Text> : null}
            {run.store?.contact ? <Text style={styles.runStoreContact}>{run.store.contact}</Text> : null}
            {run.store?.howToBuy ? <Text style={styles.runStoreMeta}>{run.store.howToBuy}</Text> : null}
            {run.items.map((it, i) => (
              <Text key={i} style={styles.runItem}>
                •  {it.label}
                {it.phaseName ? `  (${it.phaseName})` : ""}
              </Text>
            ))}
            {run.store?.website ? (
              <Pressable onPress={() => Linking.openURL(run.store!.website)} hitSlop={8}>
                <Text style={styles.runStoreLink}>
                  {run.store.website.replace(/^https?:\/\//, "").replace(/\/$/, "")} →
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
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
        <View style={[styles.priorityPill, { backgroundColor: PRIORITY_COLOR[item.priority] ?? colors.muted }]}>
          <Text style={styles.priorityText}>{item.priority ?? "recommended"}</Text>
        </View>
      </View>
      <Text style={styles.itemDescription}>{cleanText(item.description)}</Text>
      <Text style={styles.itemBudget}>
        {money(item.estimatedBudgetLowUsd)} – {money(item.estimatedBudgetHighUsd)}
      </Text>
      {asArray<string>(item.recommendedStoreIds).length > 0 && (
        <Text style={styles.itemStores}>Where: {asArray<string>(item.recommendedStoreIds).map(storeName).join(", ")}</Text>
      )}
      {item.sayThis ? (
        <View style={styles.scriptBox}>
          <Text style={styles.scriptLabel}>WHAT TO SAY IN-STORE</Text>
          <Text style={styles.sayThis}>“{cleanText(item.sayThis)}”</Text>
          {asArray<string>(item.keySpecs).map((spec, i) => (
            <Text key={i} style={styles.scriptText}>
              •  {cleanText(spec)}
            </Text>
          ))}
          {item.decline ? (
            <Text style={styles.scriptText}>
              <Text style={styles.scriptTag}>Skip: </Text>
              {cleanText(item.decline)}
            </Text>
          ) : null}
          {item.whyThisStore ? (
            <Text style={styles.scriptText}>
              <Text style={styles.scriptTag}>Why here: </Text>
              {cleanText(item.whyThisStore)}
            </Text>
          ) : null}
          {item.logistics ? (
            <Text style={styles.scriptText}>
              <Text style={styles.scriptTag}>Logistics: </Text>
              {cleanText(item.logistics)}
            </Text>
          ) : null}
        </View>
      ) : item.buyingNotes ? (
        // Older saved plans carry the script as one paragraph.
        <View style={styles.scriptBox}>
          <Text style={styles.scriptLabel}>WHAT TO SAY IN-STORE</Text>
          <Text style={styles.scriptText}>{cleanText(item.buyingNotes)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, gap: spacing.lg },
  guideTitle: { ...typography.display },
  glanceRow: { flexDirection: "row", gap: spacing.sm },
  glanceStat: {
    flex: 1,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  glanceValue: { color: colors.bayou, fontWeight: "800", fontSize: 16 },
  glanceLabel: { ...typography.small, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
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
  scriptBox: {
    backgroundColor: colors.cream,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: spacing.sm,
    marginTop: 4,
    gap: 2,
  },
  scriptLabel: { ...typography.small, color: colors.bayou, fontWeight: "800", letterSpacing: 0.5 },
  sayThis: { ...typography.body, fontSize: 14, fontWeight: "600", color: colors.bayouDark, fontStyle: "italic" },
  scriptTag: { fontWeight: "800", color: colors.bayou },
  scriptText: { ...typography.small, lineHeight: 17 },
  runCard: { backgroundColor: colors.blazerNavy, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm },
  runHeader: { color: colors.cream, fontSize: 20, fontWeight: "800" },
  runSubheader: { color: colors.cream, opacity: 0.8, fontSize: 13, lineHeight: 18, marginBottom: spacing.xs },
  runStore: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: radii.md, padding: spacing.sm, gap: 3 },
  runStoreHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  runStoreName: { color: colors.cream, fontSize: 16, fontWeight: "700", flexShrink: 1 },
  runStoreBudget: { color: colors.gold, fontWeight: "700", fontSize: 13 },
  runStoreMeta: { color: colors.cream, opacity: 0.75, fontSize: 12, lineHeight: 17 },
  runStoreContact: { color: colors.gold, fontSize: 13, fontWeight: "700" },
  runItem: { color: colors.cream, fontSize: 13, lineHeight: 19 },
  runStoreLink: { color: colors.gold, fontSize: 12, fontWeight: "700", textDecorationLine: "underline", marginTop: 2 },
  tipsCard: { backgroundColor: colors.paper, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  tipText: { ...typography.body },
  pepCard: { backgroundColor: colors.gold, borderRadius: radii.md, padding: spacing.md },
  pepText: { ...typography.body, color: colors.bayouDark, fontWeight: "600" },
  directoryButton: { alignItems: "center", paddingVertical: spacing.md },
  directoryButtonText: { color: colors.bayou, fontWeight: "700", textDecorationLine: "underline" },
  startOverButton: { alignItems: "center", paddingVertical: spacing.sm, marginBottom: spacing.lg },
  startOverText: { color: colors.muted, textDecorationLine: "underline" },
});
