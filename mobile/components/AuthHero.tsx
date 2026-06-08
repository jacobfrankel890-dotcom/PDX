import { Platform, Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AUTH_BG, AUTH_HERO, SCREEN_WIDTH, authHeroHeight, authHeroOverlap, authHorizontalPad } from "../constants/auth-chrome";
import { PdxLogo } from "./PdxLogo";

type Props = {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AuthHero({ compact, style }: Props) {
  const insets = useSafeAreaInsets();
  const height = authHeroHeight(compact);

  return (
    <View style={[styles.wrap, { height, marginHorizontal: -authHorizontalPad, marginBottom: authHeroOverlap }, style]}>
      <Image
        source={AUTH_HERO}
        style={[styles.heroImage, { height, width: SCREEN_WIDTH }]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      <BlurView
        intensity={Platform.OS === "ios" ? 28 : 48}
        tint="dark"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.dimOverlay} pointerEvents="none" />

      {/* Extra darken behind logo / status bar */}
      <View style={styles.topScrim} pointerEvents="none">
        <View style={styles.topScrimStrong} />
        <View style={styles.topScrimFade} />
        <View style={styles.topScrimClear} />
      </View>

      {/* Fade tire into the black content panel below */}
      <View style={styles.scrim} pointerEvents="none">
        <View style={styles.scrimSoft} />
        <View style={styles.scrimMid} />
        <View style={styles.scrimSolid} />
      </View>

      <View style={[styles.logoDock, { top: insets.top + 8, left: authHorizontalPad }]}>
        <View style={styles.logoBackdrop}>
          <PdxLogo size={compact ? "md" : "lg"} tagline="Expense" onDark />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SCREEN_WIDTH,
    overflow: "hidden",
    backgroundColor: AUTH_BG,
  },
  heroImage: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  topScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 168,
  },
  topScrimStrong: {
    height: 88,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  topScrimFade: {
    height: 48,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  topScrimClear: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0)",
  },
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
  },
  scrimSoft: {
    flex: 1,
    backgroundColor: "rgba(10,10,10,0.15)",
  },
  scrimMid: {
    height: 44,
    backgroundColor: "rgba(10,10,10,0.65)",
  },
  scrimSolid: {
    height: 40,
    backgroundColor: AUTH_BG,
  },
  logoDock: {
    position: "absolute",
    zIndex: 2,
  },
  logoBackdrop: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
});
