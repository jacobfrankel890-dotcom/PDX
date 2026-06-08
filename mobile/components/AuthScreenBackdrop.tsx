import { Platform, Image, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

/** Tire photo only — never use the wordmark here. */
const TIRE_BACKDROP = require("../assets/auth-backdrop-tire.jpg");

/** Full-screen tire photo + blur + one dark shade. Sits behind all auth UI. */
export function AuthScreenBackdrop() {
  return (
    <View style={styles.root} pointerEvents="none">
      <Image
        source={TIRE_BACKDROP}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <BlurView
        intensity={Platform.OS === "ios" ? 28 : 42}
        tint="dark"
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <View style={styles.shade} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  shade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
});
