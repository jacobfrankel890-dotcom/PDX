import { type ReactNode } from "react";
import { ImageBackground, Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

const TIRE_BG = require("../assets/welcome-bg-tire-v2.jpg");

type Props = {
  children: ReactNode;
};

/** Full-screen tire photo, blurred + evenly darkened. UI sits on top as children. */
export function AuthScreenLayout({ children }: Props) {
  return (
    <ImageBackground source={TIRE_BG} style={styles.root} imageStyle={styles.image} resizeMode="cover">
      <StatusBar style="light" />
      <BlurView
        intensity={100}
        tint="dark"
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
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
  image: {
    opacity: 0.45,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.92)",
  },
  content: {
    flex: 1,
  },
});
