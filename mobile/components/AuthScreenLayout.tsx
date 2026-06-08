import { type ReactNode } from "react";
import { ImageBackground, Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

const TIRE_BG = require("../assets/welcome-bg-tire-v2.jpg");

type Props = {
  children: ReactNode;
};

/**
 * Full-screen tire photo with blur + shade. UI is rendered as children on top
 * (ImageBackground) so iOS never paints the photo over the foreground.
 */
export function AuthScreenLayout({ children }: Props) {
  return (
    <ImageBackground source={TIRE_BG} style={styles.root} resizeMode="cover">
      <StatusBar style="light" />
      <BlurView
        intensity={Platform.OS === "ios" ? 42 : 55}
        tint="dark"
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <View style={styles.shade} pointerEvents="none" />
      <View style={styles.vignette} pointerEvents="none" />
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
  shade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.68)",
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  content: {
    flex: 1,
  },
});
