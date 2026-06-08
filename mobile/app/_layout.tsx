import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "../constants/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: colors.white, headerTitleStyle: { fontWeight: "600" } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ title: "Sign In" }} />
        <Stack.Screen name="(auth)/signup" options={{ title: "Create Account" }} />
        <Stack.Screen name="(app)/dashboard" options={{ title: "PDX Expense" }} />
        <Stack.Screen name="(app)/reports/new" options={{ title: "New Report" }} />
        <Stack.Screen name="(app)/reports/[id]" options={{ title: "Expense Report" }} />
      </Stack>
    </>
  );
}
