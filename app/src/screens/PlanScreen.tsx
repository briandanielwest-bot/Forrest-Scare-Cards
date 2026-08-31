import React from "react";
import { Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppContext } from "../context/AppContext";
import { fetchStores } from "../api/client";
import { KylaPortrait } from "../components/KylaPortrait";
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

// The UI wraps sayThis in curly quotes itself; the model sometimes quotes
// it too (seen live: “"I want a navy suit…"”) — strip any quotes it added.
function unquote(text: string): string {
  return text.replace(/^["“”']+/, "").replace(/["“”']+$/, "");
}

// Stretch-goal items are deliberately budgeted at $0 today, and "$0 – $0"
// reads like a bug — label the intent instead.
function moneyRange(low: number | undefined | null, high: number | undefined | null): string {
  const lo = Number(low) || 0;
  const hi = Number(high) || 0;
  return lo === 0 && hi === 0 ? "$0 today — buy later" : `${money(lo)} – ${money(hi)}`;
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
        label: `${item.quantity > 1 ? `${item.quantity}× ` : ""}${item.itemName ?? item.category}`,
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
  const { wardrobePlan, stores, setStores, setCategoryLabels, storeById, resetSession, purchasedKeys, togglePurchased } =
    useAppContext();
  const [copied, setCopied] = React.useState(false);

  async function handleCopyPlan() {
    if (!wardrobePlan) return;
    const text = buildPlanText(wardrobePlan, (id) => storeById(id)?.name ?? id);
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        await Share.share({ message: text });
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard/share denied — nothing to clean up.
    }
  }

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

        <ProgressStrip plan={plan} purchasedKeys={purchasedKeys} />

        {/* Read order matches how he'll actually use it: WHEN to buy,
            then WHERE (with what), then the full detail per item. */}
        <Pressable style={styles.copyButton} onPress={handleCopyPlan}>
          <Text style={styles.copyButtonText}>
            {copied ? "✓ Copied — paste it anywhere" : "📋 Copy plan to hand to the store"}
          </Text>
        </Pressable>

        <BuyingTimeline plan={plan} storeName={(id) => storeById(id)?.name ?? id} />

        <StoreRunList runs={buildStoreRuns(plan, storeById)} />

        <Text style={styles.sectionHeader}>The game plan</Text>
        <Text style={styles.narrative}>{cleanText(plan.introNarrative)}</Text>

        <View style={styles.calloutCard}>
          <Text style={styles.calloutLabel}>Houston climate notes</Text>
          <Text style={styles.calloutText}>{cleanText(plan.climateNotes)}</Text>
        </View>

        <Text style={styles.sectionHeader}>The full breakdown — every item, with your in-store script</Text>

        {asArray<WardrobePlan["phases"][number]>(plan.phases).map((phase, i) => (
          <View key={phase.name ?? i} style={styles.phaseCard}>
            <Text style={styles.phaseTiming}>{(phase.timingLabel ?? "").toUpperCase()}</Text>
            <Text style={styles.phaseName}>{phase.name ?? "Phase"}</Text>
            <Text style={styles.phaseGoal}>{cleanText(phase.goal)}</Text>

            {asArray<WardrobeItem>(phase.items).map((item, idx) => (
              <ItemRow
                key={idx}
                item={item}
                storeName={(id) => storeById(id)?.name ?? id}
                purchased={purchasedKeys.includes(itemKey(i, idx))}
                onTogglePurchased={() => togglePurchased(itemKey(i, idx))}
              />
            ))}
          </View>
        ))}

        <View style={styles.tipsCard}>
          <Text style={styles.calloutLabel}>Buying tips</Text>
          {asArray<string>(plan.generalBuyingTips).map((tip, i) => (
            <Text key={i} style={styles.tipText}>
              •  {cleanText(tip)}
            </Text>
          ))}
        </View>

        <View style={styles.pepCard}>
          <View style={styles.pepHeader}>
            <KylaPortrait size={40} />
            <Text style={styles.pepLabel}>A NOTE FROM KYLA</Text>
          </View>
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

// Renders the whole plan as clean plain text — what he pastes into Notes,
// texts to himself, or shows at a store counter.
function buildPlanText(plan: WardrobePlan, storeName: (id: string) => string): string {
  const lines: string[] = [plan.guideTitle ?? "Your Houston Wardrobe Plan", ""];
  lines.push(`TOTAL BUDGET: ${money(plan.budgetSummary?.totalBudgetUsd)}`, "");
  for (const phase of asArray<WardrobePlan["phases"][number]>(plan.phases)) {
    lines.push(`== ${(phase.timingLabel ?? "").toUpperCase()} — ${phase.name ?? "Phase"} ==`);
    for (const item of asArray<WardrobeItem>(phase.items)) {
      const label = `${item.quantity > 1 ? `${item.quantity}x ` : ""}${item.itemName ?? item.category}`;
      const stores = asArray<string>(item.recommendedStoreIds).map(storeName).join(" / ");
      lines.push(`• ${label} (${moneyRange(item.estimatedBudgetLowUsd, item.estimatedBudgetHighUsd)}) — ${stores}`);
      if (item.sayThis) lines.push(`  Say: "${unquote(cleanText(item.sayThis))}"`);
      for (const spec of asArray<string>(item.keySpecs)) lines.push(`  - ${cleanText(spec)}`);
      if (item.tip) lines.push(`  Tip: ${cleanText(item.tip)}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// Stable per-plan key for check-off state (index-based: plans are
// immutable once generated).
function itemKey(phaseIdx: number, idx: number): string {
  return `p${phaseIdx}i${idx}`;
}

// "3 of 11 bought · ≈$740 of $2,000" — the plan as a living checklist.
function ProgressStrip({ plan, purchasedKeys }: { plan: WardrobePlan; purchasedKeys: string[] }) {
  const phases = asArray<WardrobePlan["phases"][number]>(plan.phases);
  let total = 0;
  let bought = 0;
  let spentMid = 0;
  phases.forEach((phase, pi) => {
    asArray<WardrobeItem>(phase.items).forEach((item, ii) => {
      total += 1;
      if (purchasedKeys.includes(itemKey(pi, ii))) {
        bought += 1;
        spentMid += ((Number(item.estimatedBudgetLowUsd) || 0) + (Number(item.estimatedBudgetHighUsd) || 0)) / 2;
      }
    });
  });
  if (bought === 0) return null;
  return (
    <View style={styles.progressStrip}>
      <View style={[styles.progressFill, { width: `${Math.min(100, (bought / Math.max(1, total)) * 100)}%` }]} />
      <Text style={styles.progressText}>
        {bought} of {total} bought · ≈{money(Math.round(spentMid))} of {money(plan.budgetSummary?.totalBudgetUsd)}
      </Text>
    </View>
  );
}

// The top-of-report summary: when he's buying, what he's buying, from
// which store, and what it costs — the whole plan before any detail.
function BuyingTimeline({ plan, storeName }: { plan: WardrobePlan; storeName: (id: string) => string }) {
  const phases = asArray<WardrobePlan["phases"][number]>(plan.phases);
  const amounts = asArray<{ phaseName: string; amountUsd: number }>(plan.budgetSummary?.perPhaseUsd);
  if (phases.length === 0) return null;
  // His literal first move: the first store of the first phase.
  const firstPhase = phases[0];
  const firstItem = asArray<WardrobeItem>(firstPhase?.items)[0];
  const firstStoreId = asArray<string>(firstItem?.recommendedStoreIds)[0];

  return (
    <View style={styles.timelineCard}>
      <Text style={styles.timelineHeader}>Your buying timeline</Text>
      {firstStoreId ? (
        <Text style={styles.timelineStart}>
          ▶ First move: {storeName(firstStoreId)} — {(firstPhase.timingLabel || "this week").toLowerCase()}
        </Text>
      ) : null}
      {phases.map((phase, i) => {
        const amount = amounts.find((a) => a.phaseName === phase.name)?.amountUsd ?? amounts[i]?.amountUsd;
        // One line per store this phase visits: "Store — item, item".
        const byStore = new Map<string, string[]>();
        for (const item of asArray<WardrobeItem>(phase.items)) {
          const primary = asArray<string>(item.recommendedStoreIds)[0];
          if (!primary) continue;
          const label = `${item.quantity > 1 ? `${item.quantity}× ` : ""}${item.itemName ?? item.category ?? "item"} (${moneyRange(item.estimatedBudgetLowUsd, item.estimatedBudgetHighUsd)})`;
          byStore.set(primary, [...(byStore.get(primary) ?? []), label]);
        }
        return (
          <View key={phase.name ?? i} style={styles.timelinePhase}>
            <View style={styles.timelineRow}>
              <Text style={styles.timelineWhen}>{phase.timingLabel || `Phase ${i + 1}`}</Text>
              <Text style={styles.timelineAmount}>{amount != null ? money(amount) : ""}</Text>
            </View>
            {phase.name ? <Text style={styles.timelinePhaseName}>{phase.name}</Text> : null}
            {Array.from(byStore.entries()).map(([storeId, items]) => (
              <Text key={storeId} style={styles.timelineStoreLine}>
                <Text style={styles.timelineStoreName}>{storeName(storeId)}</Text> — {items.join(", ")}
              </Text>
            ))}
          </View>
        );
      })}
      <View style={[styles.timelineRow, styles.timelineTotalRow]}>
        <Text style={styles.timelineTotalLabel}>Total</Text>
        <Text style={styles.timelineAmount}>{money(plan.budgetSummary?.totalBudgetUsd)}</Text>
      </View>
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
              <Text style={styles.runStoreBudget}>{moneyRange(low, high)}</Text>
            </View>
            {run.store?.neighborhood ? <Text style={styles.runStoreMeta}>{run.store.neighborhood}</Text> : null}
            {run.store?.contact ? (
              (() => {
                const digits = run.store!.contact!.replace(/[^\d]/g, "");
                return digits.length >= 10 ? (
                  <Pressable onPress={() => Linking.openURL(`tel:+1${digits.slice(-10)}`)} hitSlop={6}>
                    <Text style={styles.runStoreContact}>📞 {run.store!.contact}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.runStoreContact}>{run.store!.contact}</Text>
                );
              })()
            ) : null}
            {run.store?.knownFor ? <Text style={styles.runStoreKnownFor}>Known for: {run.store.knownFor}</Text> : null}
            {run.store?.howToBuy ? <Text style={styles.runStoreMeta}>{run.store.howToBuy}</Text> : null}
            {run.items.map((it, i) => (
              <Text key={i} style={styles.runItem}>
                •  {it.label} — {moneyRange(it.low, it.high)}
                {it.phaseName ? `  (${it.phaseName})` : ""}
              </Text>
            ))}
            <View style={styles.runLinkRow}>
              {run.store?.website ? (
                <Pressable onPress={() => Linking.openURL(run.store!.website)} hitSlop={8} style={styles.runLinkShrink}>
                  {/* Domain only — full store URLs overflowed the card and
                      pushed the Map link out of reach (seen live). */}
                  <Text style={styles.runStoreLink} numberOfLines={1}>
                    {run.store.website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]} →
                  </Text>
                </Pressable>
              ) : null}
              {run.store ? (
                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${run.store!.name} ${run.store!.neighborhood} Houston TX`)}`,
                    )
                  }
                  hitSlop={8}
                >
                  <Text style={styles.runStoreLink}>📍 Map</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ItemRow({
  item,
  storeName,
  purchased,
  onTogglePurchased,
}: {
  item: WardrobeItem;
  storeName: (id: string) => string;
  purchased: boolean;
  onTogglePurchased: () => void;
}) {
  return (
    <View style={[styles.item, purchased && styles.itemPurchased]}>
      <View style={styles.itemHeader}>
        <Pressable onPress={onTogglePurchased} hitSlop={8} style={styles.checkRow}>
          <View style={[styles.checkCircle, purchased && styles.checkCircleOn]}>
            {purchased ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <Text style={[styles.itemCategory, purchased && styles.itemCategoryDone]}>
            {item.quantity > 1 ? `${item.quantity}× ` : ""}
            {item.itemName ?? item.category}
          </Text>
        </Pressable>
        <View style={[styles.priorityPill, { backgroundColor: PRIORITY_COLOR[item.priority] ?? colors.muted }]}>
          <Text style={styles.priorityText}>{item.priority ?? "recommended"}</Text>
        </View>
      </View>
      <Text style={styles.itemDescription}>{cleanText(item.description)}</Text>
      <Text style={styles.itemBudget}>{moneyRange(item.estimatedBudgetLowUsd, item.estimatedBudgetHighUsd)}</Text>
      {asArray<string>(item.recommendedStoreIds).length > 0 && (
        <Text style={styles.itemStores}>Where: {asArray<string>(item.recommendedStoreIds).map(storeName).join(", ")}</Text>
      )}
      {item.sayThis ? (
        <View style={styles.scriptBox}>
          <Text style={styles.scriptLabel}>WHAT TO SAY IN-STORE</Text>
          <Text style={styles.sayThis}>“{unquote(cleanText(item.sayThis))}”</Text>
          {asArray<string>(item.keySpecs).map((spec, i) => (
            <Text key={i} style={styles.scriptText}>
              •  {cleanText(spec)}
            </Text>
          ))}
          {item.tip ? (
            <Text style={styles.scriptText}>
              <Text style={styles.scriptTag}>Tip: </Text>
              {cleanText(item.tip)}
            </Text>
          ) : null}
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
  sectionHeader: {
    ...typography.subtitle,
    color: colors.bayou,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  timelineCard: {
    backgroundColor: colors.paper,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: spacing.md,
    gap: spacing.sm,
  },
  timelineHeader: { ...typography.title, fontSize: 18, color: colors.bayouDark },
  timelineRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  timelinePhase: { gap: 2 },
  timelineStart: {
    ...typography.small,
    color: colors.bayouDark,
    fontWeight: "800",
    backgroundColor: "#F4E9C9",
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    overflow: "hidden",
  },
  timelinePhaseName: { ...typography.body, fontSize: 14, fontWeight: "700", color: colors.ink },
  timelineWhen: { ...typography.small, color: colors.bayou, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 1 },
  timelineStoreLine: { ...typography.small, lineHeight: 18, color: colors.ink },
  timelineStoreName: { fontWeight: "800", color: colors.bayouDark },
  timelineAmount: { color: colors.bayouDark, fontWeight: "800", fontSize: 15 },
  timelineTotalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  timelineTotalLabel: { ...typography.body, fontWeight: "800" },
  pepHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  pepLabel: { color: colors.bayouDark, fontWeight: "800", fontSize: 11, letterSpacing: 1.2 },
  progressStrip: {
    backgroundColor: colors.paper,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.bayou,
    overflow: "hidden",
    paddingVertical: 6,
    alignItems: "center",
    position: "relative",
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#DCE8DF",
  },
  progressText: { ...typography.small, fontWeight: "800", color: colors.bayouDark },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.bayou,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleOn: { backgroundColor: colors.bayou },
  checkMark: { color: colors.cream, fontWeight: "800", fontSize: 13, lineHeight: 15 },
  itemPurchased: { opacity: 0.55 },
  itemCategoryDone: { textDecorationLine: "line-through" },
  copyButton: {
    backgroundColor: colors.bayou,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
  },
  copyButtonText: { color: colors.cream, fontWeight: "800", fontSize: 14 },
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
  runStoreKnownFor: { color: colors.gold, opacity: 0.95, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  runStoreContact: { color: colors.gold, fontSize: 13, fontWeight: "700" },
  runItem: { color: colors.cream, fontSize: 13, lineHeight: 19 },
  runStoreLink: { color: colors.gold, fontSize: 12, fontWeight: "700", textDecorationLine: "underline", marginTop: 2 },
  runLinkRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  runLinkShrink: { flexShrink: 1 },
  tipsCard: { backgroundColor: colors.paper, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  tipText: { ...typography.body },
  pepCard: { backgroundColor: colors.gold, borderRadius: radii.md, padding: spacing.md },
  pepText: { ...typography.body, color: colors.bayouDark, fontWeight: "600" },
  directoryButton: { alignItems: "center", paddingVertical: spacing.md },
  directoryButtonText: { color: colors.bayou, fontWeight: "700", textDecorationLine: "underline" },
  startOverButton: { alignItems: "center", paddingVertical: spacing.sm, marginBottom: spacing.lg },
  startOverText: { color: colors.muted, textDecorationLine: "underline" },
});
