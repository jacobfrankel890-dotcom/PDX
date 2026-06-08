import { View } from "react-native";
import { Stack } from "expo-router";
import { useTheme } from "../../lib/settings-context";

export default function AppLayout() {
  const { colors } = useTheme();

  const screenOptions = {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.primary,
    headerTitleStyle: { fontWeight: "700" as const, color: colors.text },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal" as const,
    headerBackTitle: "",
    contentStyle: { backgroundColor: colors.bg },
    animation: "default" as const,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="submit"
          options={{
            headerShown: false,
            presentation: "modal",
            contentStyle: { backgroundColor: colors.bg },
          }}
        />
        <Stack.Screen name="expense/[id]" options={{ title: "Receipt" }} />
        <Stack.Screen name="reports/new" options={{ headerShown: false }} />
        <Stack.Screen name="reports/[id]" options={{ title: "Report Details" }} />
      </Stack>
    </View>
  );
}
