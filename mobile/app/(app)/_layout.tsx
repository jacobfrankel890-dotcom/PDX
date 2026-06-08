import { Stack } from "expo-router";
import { useTheme } from "../../lib/settings-context";

export default function AppLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="submit" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="reports/new" options={{ headerShown: false }} />
      <Stack.Screen name="reports/[id]" options={{ title: "Report Details" }} />
    </Stack>
  );
}
