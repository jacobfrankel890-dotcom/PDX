import { type ReactNode } from "react";
import { Image, ImageBackground, Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

const TIRE_BG = require("../assets/welcome-bg-tire-v2.jpg");

type Props = {
  children: ReactNode;
};

/** Full-screen tire photo, blurred + darkened. UI renders as ImageBackground children. */
export function AuthScreenLayout({ children }: Props) {
  return (
    <ImageBackground source={TIRE_BG} style={styles.root} resizeMode="cover">
      <StatusBar style="light" />

      {/* Blurred duplicate — works reliably over ImageBackground on iOS */}
      {Platform.OS === "ios" ? (
        <Image
          source={TIRE_BG}
          blurRadius={28}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          pointerEvents="none"
        />
      ) : (
        <BlurView
          intensity={64}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      )}

      <View style={styles.scrim} pointerEvents="none" />

      <SafeAreaView style={styles.content} edges={["top", "bottom"]}>
        {children}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  content: {
    flex: 1,
  },
});
