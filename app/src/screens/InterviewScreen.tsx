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
import { colors, radii, spacing, typography } from "../theme/theme";
import type { ChatMessage } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Interview">;

export function InterviewScreen({ navigation }: Props) {
  const { sessionId, chatMessages, setChatMessages, setStyleProfile, interviewDone, setInterviewDone } =
    useAppContext();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  async function handleSend() {
    const message = draft.trim();
    if (!message || !sessionId || sending) return;

    setError(null);
    setDraft("");
    setChatMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: message }]);
    setSending(true);

    try {
      const result = await sendInterviewMessage(sessionId, message);
      setChatMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", text: result.reply }]);
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <FlatList
          ref={listRef}
          data={chatMessages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.assistantBubble]}>
              <Text style={item.role === "user" ? styles.userText : styles.assistantText}>{item.text}</Text>
            </View>
          )}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {interviewDone ? (
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("PhotoUpload")}>
            <Text style={styles.primaryButtonText}>Next: show Fondren your photos →</Text>
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
  assistantBubble: { backgroundColor: colors.paper, alignSelf: "flex-start", borderWidth: 1, borderColor: colors.border },
  userBubble: { backgroundColor: colors.bayou, alignSelf: "flex-end" },
  assistantText: { ...typography.body },
  userText: { ...typography.body, color: colors.cream },
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
