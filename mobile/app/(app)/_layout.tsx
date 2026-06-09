import { View } from "react-native";
import { Stack } from "expo-router";
import { useTheme } from "../../lib/settings-context";
import { getStackScreenOptions } from "../../lib/stack-screen-options";

export default function AppLayout() {
  const { colors } = useTheme();

  const screenOptions = getStackScreenOptions(colors);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="submit"
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom",
            contentStyle: { backgroundColor: colors.bg },
          }}
        />
        <Stack.Screen
          name="expense/[id]"
          options={{ title: "Receipt", animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="reports/new"
          options={{ headerShown: false, animation: "slide_from_bottom", presentation: "modal" }}
        />
        <Stack.Screen
          name="reports/[id]"
          options={{ title: "Report Details", animation: "slide_from_right" }}
        />
      </Stack>
    </View>
  );
}
