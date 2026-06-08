import "react-native-gesture-handler";
import { useEffect } from "react";
import { View } from "react-native";
import { ThemeProvider, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableFreeze } from "react-native-screens";
import { SettingsProvider, useTheme } from "../lib/settings-context";
import { AppUpdateGate } from "../components/AppUpdateGate";
import { initBiometricSessionSync } from "../lib/biometric-auth";
import { getNavigationTheme } from "../lib/navigation-theme";
import { useRootBackground } from "../lib/use-root-background";

// Screen freezing breaks tab re-renders (blank white scenes after switching tabs).
enableFreeze(false);

function RootNavigator() {
  const { colors, isDark } = useTheme();
  useRootBackground();

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
    <ThemeProvider value={getNavigationTheme(isDark, colors)}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack screenOptions={screenOptions}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => initBiometricSessionSync(), []);

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AppUpdateGate />
        <RootNavigator />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
