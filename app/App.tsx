import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useAppContext } from "./src/context/AppContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { colors } from "./src/theme/theme";

function AppGate() {
  const { hydrated, wardrobePlan } = useAppContext();

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bayou, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  // A restored finished plan goes straight to it; anything less complete
  // (mid-interview, no plan yet) restarts at Welcome rather than guessing
  // which half-finished screen to resume on.
  return <RootNavigator initialRouteName={wardrobePlan ? "Plan" : "Welcome"} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppGate />
        <StatusBar style="light" />
      </AppProvider>
    </SafeAreaProvider>
  );
}
