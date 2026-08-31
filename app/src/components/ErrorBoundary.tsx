import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../theme/theme";

interface Props {
  children: React.ReactNode;
  onReset: () => void;
}

interface State {
  error: Error | null;
}

// A crash anywhere below this component used to render as a blank white
// screen with zero clues (React's default when nothing catches an error).
// This gives the user a recoverable screen instead and surfaces the
// actual error message, which is what let us diagnose the web photo-
// upload bug in the first place.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset();
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.body}>
              The app hit an unexpected error building or showing your plan. This isn't your fault. Tap below to
              start over.
            </Text>
            <Text style={styles.errorText}>{this.state.error.message}</Text>
            <Pressable style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Start over</Text>
            </Pressable>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bayou },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  title: { ...typography.display, color: colors.cream, textAlign: "center" },
  body: { ...typography.body, color: colors.cream, opacity: 0.9, textAlign: "center" },
  errorText: {
    ...typography.small,
    color: colors.cream,
    opacity: 0.7,
    textAlign: "center",
    fontFamily: "monospace",
  },
  button: {
    backgroundColor: colors.gold,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    marginTop: spacing.md,
  },
  buttonText: { color: colors.bayouDark, fontWeight: "800", fontSize: 16 },
});
