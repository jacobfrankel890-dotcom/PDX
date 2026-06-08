import { Image, Platform, StyleSheet, View } from "react-native";

/** Only image on auth screens — tire photo, full bleed. */
const WELCOME_TIRE_BG = require("../assets/welcome-bg-tire-v2.jpg");

export function AuthScreenBackdrop() {
  return (
    <View style={styles.root} pointerEvents="none">
      <Image
        source={WELCOME_TIRE_BG}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        blurRadius={Platform.OS === "ios" ? 18 : 12}
        accessibilityIgnoresInvertColors
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
    backgroundColor: "rgba(0,0,0,0.62)",
  },
});
