import React, { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppContext } from "../context/AppContext";
import { analyzePhotos, type PickedPhoto } from "../api/client";
import { colors, radii, spacing, typography } from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "PhotoUpload">;

const MAX_PHOTOS = 10;

export function PhotoUploadScreen({ navigation }: Props) {
  const { sessionId } = useAppContext();
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library access is needed for Fondren to see your look.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS,
      quality: 0.7,
    });

    if (!result.canceled) {
      const picked: PickedPhoto[] = result.assets.slice(0, MAX_PHOTOS).map((a) => ({
        uri: a.uri,
        fileName: a.fileName,
        mimeType: a.mimeType,
      }));
      setPhotos(picked);
    }
  }

  async function handleAnalyze() {
    if (!sessionId || photos.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await analyzePhotos(sessionId, photos);
      navigation.navigate("GeneratingPlan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fondren couldn't process those — try again?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Show Fondren what you've got</Text>
        <Text style={styles.subtitle}>
          Upload as many photos as you want — current outfits, full-body shots, whatever you have. More photos means
          a sharper read on your fit, coloring, and current style.
        </Text>

        <Pressable style={styles.pickButton} onPress={handlePick}>
          <Text style={styles.pickButtonText}>{photos.length ? "Change photos" : "Choose photos"}</Text>
        </Pressable>

        {photos.length > 0 && (
          <View style={styles.grid}>
            {photos.map((p, i) => (
              <Image key={p.uri + i} source={{ uri: p.uri }} style={styles.thumb} />
            ))}
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.primaryButton, (!photos.length || busy) && styles.disabled]}
          onPress={handleAnalyze}
          disabled={!photos.length || busy}
        >
          {busy ? <ActivityIndicator color={colors.cream} /> : <Text style={styles.primaryButtonText}>Analyze my photos →</Text>}
        </Pressable>
        <Pressable onPress={() => navigation.navigate("GeneratingPlan")}>
          <Text style={styles.skip}>Skip — build my plan without photos</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.title },
  subtitle: { ...typography.body, color: colors.muted },
  pickButton: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  pickButtonText: { ...typography.subtitle, color: colors.bayou },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  thumb: { width: 88, height: 88, borderRadius: radii.sm },
  error: { color: colors.danger },
  footer: { padding: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  primaryButton: { backgroundColor: colors.gold, paddingVertical: spacing.md, borderRadius: radii.pill, alignItems: "center" },
  disabled: { opacity: 0.5 },
  primaryButtonText: { color: colors.bayouDark, fontWeight: "800", fontSize: 15 },
  skip: { textAlign: "center", color: colors.muted, textDecorationLine: "underline" },
});
