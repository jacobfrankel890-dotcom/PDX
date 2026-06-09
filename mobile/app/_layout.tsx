import "react-native-gesture-handler";
import { useEffect } from "react";
import { View } from "react-native";
import { ThemeProvider, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableFreeze } from "react-native-screens";
import { SettingsProvider, useTheme } from "../lib/settings-context";
import { ToastProvider } from "../lib/toast-context";
import { AppUpdateGate } from "../components/AppUpdateGate";
import { initBiometricSessionSync } from "../lib/biometric-auth";
import { configureNotificationHandler } from "../lib/push-notifications";
import { getNavigationTheme } from "../lib/navigation-theme";
import { getStackScreenOptions } from "../lib/stack-screen-options";
import { useNotificationLinking } from "../lib/use-notification-linking";
import { useRootBackground } from "../lib/use-root-background";

// Screen freezing breaks tab re-renders (blank white scenes after switching tabs).
enableFreeze(false);

function RootNavigator() {
  const { colors, isDark } = useTheme();
  useRootBackground();

  const screenOptions = getStackScreenOptions(colors);

  return (
    <ThemeProvider value={getNavigationTheme(isDark, colors)}>
      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack screenOptions={screenOptions}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="(auth)"
            options={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
          />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useNotificationLinking();

  useEffect(() => {
    configureNotificationHandler();
    initBiometricSessionSync();
  }, []);

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ToastProvider>
          <AppUpdateGate />
          <RootNavigator />
        </ToastProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
