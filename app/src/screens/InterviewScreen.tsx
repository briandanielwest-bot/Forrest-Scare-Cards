import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppContext } from "../context/AppContext";
import { sendInterviewMessage } from "../api/client";
import { KylaPortrait } from "../components/KylaPortrait";
import { colors, radii, spacing, typography } from "../theme/theme";
import type { ChatMessage } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Interview">;

export function InterviewScreen({ navigation }: Props) {
  const { sessionId, chatMessages, setChatMessages, setStyleProfile, interviewDone, setInterviewDone } =
    useAppContext();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [dotBeat, setDotBeat] = useState(0);

  // Pulses the classic three-dot typing indicator while Kyla's reply is
  // in flight — one dot lights up at a time, like every texting app.
  React.useEffect(() => {
    if (!sending) return;
    const interval = setInterval(() => setDotBeat((b) => (b + 1) % 3), 350);
    return () => clearInterval(interval);
  }, [sending]);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  async function sendText(message: string) {
    if (!message || !sessionId || sending) return;

    setError(null);
    setDraft("");
    setChatMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: message }]);
    setSending(true);

    try {
      const result = await sendInterviewMessage(sessionId, message);
      setChatMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: result.reply, quickReplies: result.quickReplies },
      ]);
      if (result.done && result.profile) {
        setStyleProfile(result.profile);
        setInterviewDone(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kyla didn't get that — try again?");
    } finally {
      setSending(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }

  function handleSend() {
    void sendText(draft.trim());
  }

  // Chips belong to Kyla's latest message only — once he answers (typed or
  // tapped), the conversation has moved past them.
  const lastMessage = chatMessages[chatMessages.length - 1];
  const activeQuickReplies =
    !interviewDone && !sending && lastMessage?.role === "assistant" ? lastMessage.quickReplies ?? [] : [];

  // The chip row and typing bubble appearing/disappearing resize the list
  // viewport, which used to leave the latest message half-scrolled out —
  // re-anchor to the bottom whenever the layout around the list changes.
  React.useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    return () => clearTimeout(t);
  }, [activeQuickReplies.length, sending]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <FlatList
          ref={listRef}
          data={sending ? [...chatMessages, { id: "typing", role: "assistant" as const, text: "typing" }] : chatMessages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) =>
            item.id === "typing" ? (
              <View style={styles.assistantRow}>
                <KylaPortrait size={34} />
                <View style={[styles.bubble, styles.assistantBubble, styles.typingBubble]}>
                  <View style={styles.dotRow}>
                    {[0, 1, 2].map((i) => (
                      <View key={i} style={[styles.dot, dotBeat === i && styles.dotActive]} />
                    ))}
                  </View>
                </View>
              </View>
            ) : item.role === "user" ? (
              <View style={[styles.bubble, styles.userBubble]}>
                <Text style={styles.userText}>{item.text}</Text>
              </View>
            ) : (
              <View style={styles.assistantRow}>
                <KylaPortrait size={34} />
                <View style={[styles.bubble, styles.assistantBubble]}>
                  <Text style={styles.assistantText}>{item.text}</Text>
                </View>
              </View>
            )
          }
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {activeQuickReplies.length > 0 ? (
          <View style={styles.chipRow}>
            {activeQuickReplies.map((reply) => (
              <Pressable key={reply} style={styles.chip} onPress={() => void sendText(reply)}>
                <Text style={styles.chipText}>{reply}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {interviewDone ? (
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("PhotoUpload")}>
            <Text style={styles.primaryButtonText}>Next: show Watt your photos →</Text>
          </Pressable>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Type your answer…"
              placeholderTextColor={colors.muted}
              multiline
              editable={!sending}
              onSubmitEditing={handleSend}
              onKeyPress={(e) => {
                // Web: Enter sends like a real messenger; Shift+Enter makes
                // a new line. (Native keyboards use the return key instead.)
                const native = e.nativeEvent as { key?: string; shiftKey?: boolean };
                if (Platform.OS === "web" && native.key === "Enter" && !native.shiftKey) {
                  (e as { preventDefault?: () => void }).preventDefault?.();
                  handleSend();
                }
              }}
            />
            <Pressable style={styles.sendButton} onPress={handleSend} disabled={sending || !draft.trim()}>
              {sending ? <ActivityIndicator color={colors.cream} /> : <Text style={styles.sendButtonText}>Send</Text>}
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  list: { padding: spacing.md, gap: spacing.sm },
  bubble: { maxWidth: "85%", borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.sm },
  assistantRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: 0 },
  assistantBubble: {
    backgroundColor: colors.paper,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 1,
    // Small corner nearest her face — the classic speech-bubble tail cue.
    borderBottomLeftRadius: 4,
  },
  userBubble: { backgroundColor: colors.bayou, alignSelf: "flex-end", borderBottomRightRadius: 4 },
  assistantText: { ...typography.body },
  typingBubble: { paddingVertical: spacing.sm + 2 },
  dotRow: { flexDirection: "row", gap: 5, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted, opacity: 0.35 },
  dotActive: { opacity: 1, backgroundColor: colors.bayou },
  userText: { ...typography.body, color: colors.cream },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  chip: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.bayou,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: { color: colors.bayou, fontWeight: "700", fontSize: 13 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.paper,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  sendButton: {
    backgroundColor: colors.bayou,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
  },
  sendButtonText: { color: colors.cream, fontWeight: "700" },
  primaryButton: {
    backgroundColor: colors.gold,
    margin: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  primaryButtonText: { color: colors.bayouDark, fontWeight: "800", fontSize: 15 },
  error: { color: colors.danger, textAlign: "center", marginBottom: spacing.sm },
});
