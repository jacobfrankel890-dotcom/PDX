import { Platform, Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AUTH_BG,
  AUTH_GRAY_60,
  AUTH_HERO,
  AUTH_LOGO,
  AUTH_LOGO_ASPECT,
  SCREEN_WIDTH,
  authHeroHeight,
  authHeroOverlap,
  authHorizontalPad,
} from "../constants/auth-chrome";

type Props = {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Reroute-style hero: tire photo on the top half, one dark shade on the photo,
 * official wordmark top-left — UI scrolls below with a slight overlap.
 */
export function AuthHero({ compact, style }: Props) {
  const insets = useSafeAreaInsets();
  const height = authHeroHeight(compact);
  const logoW = compact ? 108 : 124;
  const logoH = Math.round(logoW * AUTH_LOGO_ASPECT);

  return (
    <View
      style={[
        styles.wrap,
        { height, marginHorizontal: -authHorizontalPad, marginBottom: authHeroOverlap },
        style,
      ]}
    >
      <Image
        source={AUTH_HERO}
        style={{ position: "absolute", top: 0, width: SCREEN_WIDTH, height }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      <BlurView
        intensity={Platform.OS === "ios" ? 24 : 36}
        tint="dark"
        style={{ position: "absolute", top: 0, width: SCREEN_WIDTH, height }}
        pointerEvents="none"
      />

      {/* One shade — on top of photo, under logo */}
      <View style={styles.shade} pointerEvents="none" />

      <View style={[styles.logoDock, { top: insets.top + 10, left: authHorizontalPad }]}>
        <Image
          source={AUTH_LOGO}
          style={{ width: logoW, height: logoH }}
          resizeMode="contain"
          accessibilityLabel="PDX Expense"
        />
        <Text style={styles.tagline}>Expense</Text>
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
  shade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  logoDock: {
    position: "absolute",
    zIndex: 2,
    alignItems: "flex-start",
    gap: 6,
  },
  tagline: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: AUTH_GRAY_60,
    marginLeft: 2,
  },
});
