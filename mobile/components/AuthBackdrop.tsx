import { Platform, Image, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { AUTH_BG, AUTH_HERO } from "../constants/auth-chrome";

type Props = {
  compact?: boolean;
};

/**
 * Full-screen backdrop: tire photo fills the screen, then one shade on top.
 * Avoids a hard line where a short photo clip ends.
 */
export function AuthBackdrop(_props: Props) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={AUTH_HERO}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      <BlurView
        intensity={Platform.OS === "ios" ? 18 : 32}
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
