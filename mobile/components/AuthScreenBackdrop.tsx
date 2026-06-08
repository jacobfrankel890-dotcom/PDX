import { Platform, Image, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { AUTH_HERO } from "../constants/auth-chrome";

/** Full-screen tire photo + blur + one dark shade. Sits behind all auth UI. */
export function AuthScreenBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={AUTH_HERO}
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
  shade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
});
