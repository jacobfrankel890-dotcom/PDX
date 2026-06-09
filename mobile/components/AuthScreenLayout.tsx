import { type ReactNode } from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

const TIRE_BG = require("../assets/welcome-bg-tire-v2.jpg");

type Props = {
  children: ReactNode;
};

/** Full-screen tire photo, blurred + darkened for readable text. */
export function AuthScreenLayout({ children }: Props) {
  return (
    <ImageBackground source={TIRE_BG} style={styles.root} imageStyle={styles.image} resizeMode="cover">
      <StatusBar style="light" />
      <BlurView intensity={92} tint="dark" style={styles.overlay} pointerEvents="none" />
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
    backgroundColor: "#0A0A0A",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    opacity: 0.48,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.82)",
  },
  content: {
    flex: 1,
  },
});
