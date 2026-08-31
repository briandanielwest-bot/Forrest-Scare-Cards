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
  const [dots, setDots] = useState("•");

  // Animated "Kyla is typing" dots while her reply is in flight.
  React.useEffect(() => {
    if (!sending) return;
    const interval = setInterval(() => setDots((d) => (d.length >= 3 ? "•" : d + "•")), 400);
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
                <KylaPortrait size={28} />
                <View style={[styles.bubble, styles.assistantBubble, styles.typingBubble]}>
                  <Text style={styles.typingText}>Kyla is typing {dots}</Text>
                </View>
              </View>
            ) : item.role === "user" ? (
              <View style={[styles.bubble, styles.userBubble]}>
                <Text style={styles.userText}>{item.text}</Text>
              </View>
            ) : (
              <View style={styles.assistantRow}>
                <KylaPortrait size={28} />
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
  bubble: { maxWidth: "85%", borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
  assistantRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: 0 },
  assistantBubble: { backgroundColor: colors.paper, alignSelf: "flex-start", borderWidth: 1, borderColor: colors.border, flexShrink: 1 },
  userBubble: { backgroundColor: colors.bayou, alignSelf: "flex-end" },
  assistantText: { ...typography.body },
  typingBubble: { paddingVertical: spacing.sm },
  typingText: { ...typography.small, color: colors.muted, fontStyle: "italic" },
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
