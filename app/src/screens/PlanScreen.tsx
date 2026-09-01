import React from "react";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppContext } from "../context/AppContext";
import { sendPlanFeedback, askKylaAboutPlan, fetchOutfits, fetchStores, saveMemory, type Outfit } from "../api/client";
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
  return lo === 0 && hi === 0 ? "$0 today, buy later" : `${money(lo)} – ${money(hi)}`;
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

// "These pieces make N outfits" — fetched once on demand, the capsule
// payoff without any cost to plan-generation latency.
function OutfitMatrix({ sessionId }: { sessionId: string | null }) {
  const [outfits, setOutfits] = React.useState<Outfit[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFetch() {
    if (!sessionId || loading) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchOutfits(sessionId);
      setOutfits(r.outfits);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't build the outfits, try again?");
    } finally {
      setLoading(false);
    }
  }

  if (!sessionId) return null;
  if (!outfits) {
    return (
      <View style={styles.outfitTeaser}>
        <Pressable style={styles.outfitButton} onPress={handleFetch} disabled={loading}>
          <Text style={styles.outfitButtonText}>
            {loading ? "Kyla is building your outfits…" : "👔 Show me the outfits these pieces make"}
          </Text>
        </Pressable>
        {error ? <Text style={styles.askError}>{error}</Text> : null}
      </View>
    );
  }
  return (
    <View style={styles.outfitCard}>
      <Text style={styles.outfitHeader}>
        Your {outfits.length} outfits from this plan
      </Text>
      {outfits.map((o, i) => (
        <View key={i} style={styles.outfitRow}>
          <Text style={styles.outfitName}>{o.name}</Text>
          <Text style={styles.outfitOccasion}>{o.occasion}</Text>
          <Text style={styles.outfitPieces}>{o.pieces.join("  ·  ")}</Text>
        </View>
      ))}
    </View>
  );
}

// Post-plan chat: Kyla answers questions about her picks, right on the
// plan. Local exchange list only — the server keeps the real history.
// Tester feedback, at the bottom where a man has actually read the thing.
// Two taps and an optional sentence: any more friction and the only people
// who answer are the ones who already loved it.
function PlanFeedback({ sessionId }: { sessionId: string | null }) {
  const [rating, setRating] = React.useState<"up" | "down" | null>(null);
  const [comment, setComment] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(next: "up" | "down", withComment?: string) {
    if (!sessionId) return;
    setRating(next);
    setError(null);
    try {
      await sendPlanFeedback(sessionId, next, withComment);
      if (withComment !== undefined) setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send that, try again?");
    }
  }

  if (sent) {
    return (
      <View style={styles.feedbackCard}>
        <Text style={styles.feedbackThanks}>Got it. This is genuinely how the plans get better.</Text>
      </View>
    );
  }

  return (
    <View style={styles.feedbackCard}>
      <Text style={styles.feedbackTitle}>Was this plan any good?</Text>
      <View style={styles.feedbackRow}>
        <Pressable
          style={[styles.feedbackChoice, rating === "up" && styles.feedbackChoiceOn]}
          onPress={() => submit("up")}
        >
          <Text style={[styles.feedbackChoiceText, rating === "up" && styles.feedbackChoiceTextOn]}>Yes</Text>
        </Pressable>
        <Pressable
          style={[styles.feedbackChoice, rating === "down" && styles.feedbackChoiceOn]}
          onPress={() => submit("down")}
        >
          <Text style={[styles.feedbackChoiceText, rating === "down" && styles.feedbackChoiceTextOn]}>Not really</Text>
        </Pressable>
      </View>
      {/* The rating is already recorded, so the box is a bonus rather than a
          gate. Anyone who stops here has still told us something. */}
      {rating ? (
        <>
          <TextInput
            style={styles.feedbackInput}
            value={comment}
            onChangeText={setComment}
            placeholder={rating === "up" ? "What was most useful?" : "What was wrong with it?"}
            placeholderTextColor={colors.muted}
            multiline
          />
          <Pressable style={styles.feedbackSend} onPress={() => submit(rating, comment.trim())}>
            <Text style={styles.feedbackSendText}>Send to Kyla</Text>
          </Pressable>
        </>
      ) : null}
      {error ? <Text style={styles.askError}>{error}</Text> : null}
    </View>
  );
}

function AskKyla({ sessionId, purchasedKeys }: { sessionId: string | null; purchasedKeys: string[] }) {
  const [question, setQuestion] = React.useState("");
  const [exchanges, setExchanges] = React.useState<{ q: string; a: string }[]>([]);
  const [asking, setAsking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleAsk() {
    const q = question.trim();
    if (!q || !sessionId || asking) return;
    setError(null);
    setAsking(true);
    setQuestion("");
    try {
      const { reply } = await askKylaAboutPlan(sessionId, q, purchasedKeys);
      setExchanges((prev) => [...prev, { q, a: reply }]);
    } catch (e) {
      setError(
        e instanceof Error && /session/i.test(e.message)
          ? "Kyla's memory of this session expired when the server restarted. She can chat again on your next plan."
          : "Kyla didn't get that, try again?",
      );
    } finally {
      setAsking(false);
    }
  }

  if (!sessionId) return null;
  return (
    <View style={styles.askCard}>
      <View style={styles.pepHeader}>
        <KylaPortrait size={34} />
        <Text style={styles.askTitle}>Questions? Ask Kyla</Text>
      </View>
      <Text style={styles.askHint}>Swaps, sizing, "why this store". She knows every pick in this plan.</Text>
      {exchanges.map((ex, i) => (
        <View key={i} style={styles.askExchange}>
          <Text style={styles.askQ}>You: {ex.q}</Text>
          <Text style={styles.askA}>{ex.a}</Text>
        </View>
      ))}
      {error ? <Text style={styles.askError}>{error}</Text> : null}
      <View style={styles.askRow}>
        <TextInput
          style={styles.askInput}
          value={question}
          onChangeText={setQuestion}
          placeholder="Can I swap the oxfords for loafers?"
          placeholderTextColor={colors.muted}
          editable={!asking}
          onSubmitEditing={handleAsk}
        />
        <Pressable style={styles.askButton} onPress={handleAsk} disabled={asking || !question.trim()}>
          {asking ? <ActivityIndicator color={colors.cream} size="small" /> : <Text style={styles.askButtonText}>Ask</Text>}
        </Pressable>
      </View>
    </View>
  );
}

export function PlanScreen({ navigation }: Props) {
  const {
    wardrobePlan,
    sessionId,
    stores,
    setStores,
    setCategoryLabels,
    storeById,
    resetSession,
    purchasedKeys,
    togglePurchased,
    memoryCode,
    setMemoryCode,
  } = useAppContext();
  const [copied, setCopied] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  async function handleSavePlan() {
    if (!sessionId || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { code } = await saveMemory(sessionId, purchasedKeys, memoryCode ?? undefined);
      setMemoryCode(code);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Couldn't save, try again?");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyPlan() {
    if (!wardrobePlan) return;
    const text = buildPlanText(wardrobePlan, storeById);
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
        <Text style={typography.body}>No plan yet, head back and finish the interview first.</Text>
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
            then WHERE (with what), then the full detail per item. The
            plan leads, save and copy sit under the thing they act on. */}
        <BuyingTimeline plan={plan} storeName={(id) => storeById(id)?.name ?? id} />

        <StoreRunList runs={buildStoreRuns(plan, storeById)} />

        <Pressable style={styles.copyButton} onPress={handleCopyPlan}>
          <Text style={styles.copyButtonText}>
            {copied ? "✓ Copied, paste it anywhere" : "📋 Copy plan to hand to the store"}
          </Text>
        </Pressable>

        {memoryCode ? (
          <Pressable style={styles.saveCard} onPress={handleSavePlan}>
            <Text style={styles.saveCode}>Your claim code: {memoryCode}</Text>
            <Text style={styles.saveHint}>
              {saving ? "Syncing…" : "Screenshot this. Enter it on any device to bring this plan (and your progress) back. Tap to re-sync."}
            </Text>
          </Pressable>
        ) : (
          <Pressable style={styles.saveButton} onPress={handleSavePlan} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? "Saving…" : "🔑 Save my plan, get a claim code"}</Text>
          </Pressable>
        )}
        {saveError ? <Text style={styles.askError}>{saveError}</Text> : null}

        <Text style={styles.sectionHeader}>The game plan</Text>
        <Text style={styles.narrative}>{cleanText(plan.introNarrative)}</Text>

        <View style={styles.calloutCard}>
          <Text style={styles.calloutLabel}>Houston climate notes</Text>
          <Text style={styles.calloutText}>{cleanText(plan.climateNotes)}</Text>
        </View>

        <Text style={styles.sectionHeader}>Every item. Tap to check one off as you buy it</Text>

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

        <OutfitMatrix sessionId={sessionId} />

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

        <AskKyla sessionId={sessionId} purchasedKeys={purchasedKeys} />

        <PlanFeedback sessionId={sessionId} />

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
function buildPlanText(plan: WardrobePlan, storeById: (id: string) => HoustonStore | undefined): string {
  const storeName = (id: string) => storeById(id)?.name ?? id;
  const lines: string[] = [plan.guideTitle ?? "Your Houston Wardrobe Plan", ""];
  lines.push(`TOTAL BUDGET: ${money(plan.budgetSummary?.totalBudgetUsd)}`, "");
  for (const phase of asArray<WardrobePlan["phases"][number]>(plan.phases)) {
    lines.push(`== ${(phase.timingLabel ?? "").toUpperCase()}: ${phase.name ?? "Phase"} ==`);
    for (const item of asArray<WardrobeItem>(phase.items)) {
      const label = `${item.quantity > 1 ? `${item.quantity}x ` : ""}${item.itemName ?? item.category}`;
      const stores = asArray<string>(item.recommendedStoreIds).map(storeName).join(" / ");
      lines.push(`• ${label} (${moneyRange(item.estimatedBudgetLowUsd, item.estimatedBudgetHighUsd)}) at ${stores}`);
      if (item.sayThis) lines.push(`  Say: "${unquote(cleanText(item.sayThis))}"`);
      for (const spec of asArray<string>(item.keySpecs)) lines.push(`  - ${cleanText(spec)}`);
      if (item.tip) lines.push(`  Tip: ${cleanText(item.tip)}`);
    }
    lines.push("");
  }
  // The counter conversation needs phones and neighborhoods, not just names.
  const runs = buildStoreRuns(plan, storeById);
  if (runs.length > 0) {
    lines.push("== STORE CONTACTS ==");
    for (const run of runs) {
      const s = run.store;
      const bits = [s?.neighborhood, s?.contact].filter(Boolean).join(" · ");
      lines.push(`${s?.name ?? run.storeId}${bits ? `, ${bits}` : ""}`);
    }
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
          ▶ First move: {storeName(firstStoreId)}, {(firstPhase.timingLabel || "this week").toLowerCase()}
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
                <Text style={styles.timelineStoreName}>{storeName(storeId)}</Text>: {items.join(", ")}
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
        Every item above, regrouped by store. This is your errand list. Show it at the counter.
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
                •  {it.label}, {moneyRange(it.low, it.high)}
                {it.phaseName ? `  (${it.phaseName})` : ""}
              </Text>
            ))}
            <View style={styles.runLinkRow}>
              {run.store?.website ? (
                <Pressable onPress={() => Linking.openURL(run.store!.website)} hitSlop={8} style={styles.runLinkShrink}>
                  {/* Domain only. Full store URLs overflowed the card and
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
  askCard: {
    backgroundColor: colors.paper,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.bayou,
    padding: spacing.md,
    gap: spacing.sm,
  },
  askTitle: { ...typography.title, fontSize: 16 },
  feedbackCard: {
    backgroundColor: colors.paper,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  feedbackTitle: { ...typography.title, fontSize: 15 },
  feedbackThanks: { ...typography.body, color: colors.bayouDark },
  feedbackRow: { flexDirection: "row", gap: spacing.sm },
  feedbackChoice: {
    borderWidth: 1, borderColor: colors.bayou, borderRadius: radii.md,
    paddingVertical: 8, paddingHorizontal: 16,
  },
  feedbackChoiceOn: { backgroundColor: colors.bayou },
  feedbackChoiceText: { ...typography.body, color: colors.bayouDark, fontWeight: "600" },
  feedbackChoiceTextOn: { color: colors.cream },
  feedbackInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    padding: spacing.sm, minHeight: 64, textAlignVertical: "top", color: colors.ink,
  },
  feedbackSend: {
    backgroundColor: colors.bayou, borderRadius: radii.md,
    paddingVertical: 10, alignItems: "center",
  },
  feedbackSendText: { color: colors.cream, fontWeight: "700" },
  askHint: { ...typography.small, color: colors.muted },
  askExchange: { gap: 2, borderLeftWidth: 3, borderLeftColor: colors.gold, paddingLeft: spacing.sm },
  askQ: { ...typography.small, fontWeight: "800", color: colors.bayouDark },
  askA: { ...typography.body, fontSize: 14, lineHeight: 20 },
  askError: { ...typography.small, color: colors.danger },
  askRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  askInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...typography.body,
    fontSize: 14,
  },
  askButton: {
    backgroundColor: colors.bayou,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 56,
    alignItems: "center",
  },
  askButtonText: { color: colors.cream, fontWeight: "800" },
  saveButton: {
    borderWidth: 1.5,
    borderColor: colors.bayou,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
  },
  saveButtonText: { color: colors.bayou, fontWeight: "800", fontSize: 14 },
  saveCard: {
    backgroundColor: "#F4E9C9",
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: "center",
    gap: 2,
  },
  saveCode: { color: colors.bayouDark, fontWeight: "800", fontSize: 16, letterSpacing: 1 },
  saveHint: { ...typography.small, color: colors.bayouDark, textAlign: "center" },
  outfitTeaser: { gap: spacing.xs },
  outfitButton: {
    backgroundColor: colors.blazerNavy,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
  },
  outfitButtonText: { color: colors.cream, fontWeight: "800", fontSize: 14 },
  outfitCard: {
    backgroundColor: colors.blazerNavy,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  outfitHeader: { color: colors.cream, fontSize: 18, fontWeight: "800" },
  outfitRow: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: radii.sm, padding: spacing.sm, gap: 1 },
  outfitName: { color: colors.gold, fontWeight: "800", fontSize: 14 },
  outfitOccasion: { color: colors.cream, opacity: 0.75, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  outfitPieces: { color: colors.cream, fontSize: 13, lineHeight: 19 },
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
