import { Platform, Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AUTH_BG, AUTH_HERO, SCREEN_WIDTH, authHeroHeight, authHeroOverlap, authHorizontalPad } from "../constants/auth-chrome";
import { HeroShadeOverlay } from "./HeroShadeOverlay";
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
      {/* 1 — photo */}
      <Image
        source={AUTH_HERO}
        style={[styles.heroImage, { height, width: SCREEN_WIDTH }]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      {/* 2 — soft blur */}
      <BlurView
        intensity={Platform.OS === "ios" ? 14 : 24}
        tint="dark"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* 3 — one full-height shade (image → shade → UI) */}
      <HeroShadeOverlay height={height} />

      {/* 4 — logo & labels above the shade */}
      <View style={[styles.logoDock, { top: insets.top + 10, left: authHorizontalPad }]}>
        <PdxLogo size={compact ? "md" : "lg"} tagline="Expense" onDark />
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
  logoDock: {
    position: "absolute",
    zIndex: 2,
  },
});
