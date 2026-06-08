import { Platform, Image, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import {
  AUTH_BG,
  AUTH_HERO,
  SCREEN_WIDTH,
  authHeroHeight,
} from "../constants/auth-chrome";

type Props = {
  compact?: boolean;
};

/**
 * Fixed full-screen backdrop: tire photo (top) + ONE shade over the entire screen.
 * Photo → blur → single shade → UI. No seams between hero and content.
 */
export function AuthBackdrop({ compact }: Props) {
  const photoH = authHeroHeight(compact);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={AUTH_HERO}
        style={{ position: "absolute", top: 0, width: SCREEN_WIDTH, height: photoH }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      <BlurView
        intensity={Platform.OS === "ios" ? 12 : 20}
        tint="dark"
        style={{ position: "absolute", top: 0, width: SCREEN_WIDTH, height: photoH }}
        pointerEvents="none"
      />

      <View style={styles.shade} />
    </View>
  );
}

const styles = StyleSheet.create({
  shade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.56)",
  },
});
