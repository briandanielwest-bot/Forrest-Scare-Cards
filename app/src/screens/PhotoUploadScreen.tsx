import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppContext } from "../context/AppContext";
import { analyzePhotos, type PickedPhoto } from "../api/client";
import { colors, radii, spacing, typography } from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "PhotoUpload">;

const MAX_PHOTOS = 10;

// Claude's vision API downscales anything past ~1568px on the long edge
// anyway, so uploading a phone's full-resolution photo (often 3-4MB+) is
// pure wasted upload time. Shrinking on-device first cuts a 10-photo
// upload from tens of megabytes to about one.
const MAX_DIMENSION = 1568;

const BUSY_LINES = [
  "Compressing the tape for upload…",
  "Sending your film to Watt…",
  "Watt is running your look frame by frame…",
  "Checking your fit like it's 3rd and long…",
  "Reading your colors and proportions…",
];

async function shrinkForUpload(photo: PickedPhoto): Promise<PickedPhoto> {
  const { width, height } = photo;
  const longEdge = Math.max(width ?? 0, height ?? 0);
  // Unknown dimensions or already small: send as-is.
  if (!longEdge || longEdge <= MAX_DIMENSION) return photo;
  try {
    const context = ImageManipulator.manipulate(photo.uri);
    context.resize((width ?? 0) >= (height ?? 0) ? { width: MAX_DIMENSION } : { height: MAX_DIMENSION });
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
    return { uri: result.uri, fileName: "photo.jpg", mimeType: "image/jpeg", width: result.width, height: result.height };
  } catch {
    // A failed resize should never block the upload — fall back to the original.
    return photo;
  }
}

export function PhotoUploadScreen({ navigation }: Props) {
  const { sessionId } = useAppContext();
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyLineIndex, setBusyLineIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!busy) return;
    setBusyLineIndex(0);
    const interval = setInterval(() => setBusyLineIndex((i) => (i + 1) % BUSY_LINES.length), 2500);
    return () => clearInterval(interval);
  }, [busy]);

  async function handlePick() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library access is needed for Watt to see your look.");
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
        width: a.width,
        height: a.height,
      }));
      setPhotos(picked);
    }
  }

  async function handleAnalyze() {
    if (!sessionId || photos.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const shrunk = await Promise.all(photos.map(shrinkForUpload));
      await analyzePhotos(sessionId, shrunk);
      navigation.navigate("GeneratingPlan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Watt couldn't process those, try again?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Show Watt what you've got</Text>
        <Text style={styles.subtitle}>
          Upload as many photos as you want. A clear face shot, full-body shots, current outfits, whatever you have.
          Watt reads your face shape, body type, fit, and coloring, and every one of those sharpens what the plan
          tells you to buy, down to collar styles and lapel widths that suit your face.
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
        {busy ? <Text style={styles.busyLine}>{BUSY_LINES[busyLineIndex]}</Text> : null}
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
          <Text style={styles.skip}>Skip photos, build my plan</Text>
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
  busyLine: { ...typography.body, color: colors.bayou, fontWeight: "600", textAlign: "center" },
  footer: { padding: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  primaryButton: { backgroundColor: colors.gold, paddingVertical: spacing.md, borderRadius: radii.pill, alignItems: "center" },
  disabled: { opacity: 0.5 },
  primaryButtonText: { color: colors.bayouDark, fontWeight: "800", fontSize: 15 },
  skip: { textAlign: "center", color: colors.muted, textDecorationLine: "underline" },
});
