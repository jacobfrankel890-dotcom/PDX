import "react-native-gesture-handler";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableFreeze } from "react-native-screens";
import { SettingsProvider, useTheme } from "../lib/settings-context";
import { AppUpdateGate } from "../components/AppUpdateGate";
import { initBiometricSessionSync } from "../lib/biometric-auth";

// Screen freezing breaks tab re-renders (blank white scenes after switching tabs).
enableFreeze(false);

function RootNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: "600" },
          headerBackButtonDisplayMode: "minimal",
          headerBackTitle: "",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </>
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
