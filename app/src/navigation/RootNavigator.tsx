import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { InterviewScreen } from "../screens/InterviewScreen";
import { PhotoUploadScreen } from "../screens/PhotoUploadScreen";
import { GeneratingPlanScreen } from "../screens/GeneratingPlanScreen";
import { PlanScreen } from "../screens/PlanScreen";
import { StoreDirectoryScreen } from "../screens/StoreDirectoryScreen";
import { StaplesScreen } from "../screens/StaplesScreen";
import { colors } from "../theme/theme";

export type RootStackParamList = {
  Welcome: undefined;
  Interview: undefined;
  PhotoUpload: undefined;
  GeneratingPlan: undefined;
  Plan: undefined;
  StoreDirectory: undefined;
  Staples: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator({
  initialRouteName = "Welcome",
}: {
  initialRouteName?: keyof RootStackParamList;
}) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerStyle: { backgroundColor: colors.bayou },
          headerTintColor: colors.cream,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.cream },
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Interview" component={InterviewScreen} options={{ title: "Talk to Kyla" }} />
        <Stack.Screen name="PhotoUpload" component={PhotoUploadScreen} options={{ title: "Show Theo Your Photos" }} />
        <Stack.Screen
          name="GeneratingPlan"
          component={GeneratingPlanScreen}
          options={{ title: "Building Your Guide", headerBackVisible: false }}
        />
        <Stack.Screen name="Plan" component={PlanScreen} options={{ title: "Your Houston Guide" }} />
        <Stack.Screen name="StoreDirectory" component={StoreDirectoryScreen} options={{ title: "Houston Store Directory" }} />
        <Stack.Screen name="Staples" component={StaplesScreen} options={{ title: "Kyla's Starter Staples" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
