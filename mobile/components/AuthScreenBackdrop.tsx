import { Platform, Image, StyleSheet, View, useWindowDimensions } from "react-native";
import { BlurView } from "expo-blur";

const TIRE_BG = require("../assets/welcome-bg-tire-v2.jpg");

export function AuthScreenBackdrop() {
  const { width, height } = useWindowDimensions();

  return (
    <View style={[styles.root, { width, height }]}>
      <Image source={TIRE_BG} style={{ width, height }} resizeMode="cover" />
      <BlurView
        intensity={Platform.OS === "ios" ? 30 : 45}
        tint="dark"
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.shade} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  shade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
});
