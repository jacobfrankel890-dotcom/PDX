import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AUTH_BG,
  AUTH_HERO,
  AUTH_LOGO,
  SCREEN_WIDTH,
  authHeroHeight,
  authHorizontalPad,
} from "../constants/auth-chrome";

type Props = {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  headerRight?: React.ReactNode;
};

export function AuthHero({ compact, style, headerRight }: Props) {
  const insets = useSafeAreaInsets();
  const height = authHeroHeight(compact);
  const logoSize = compact ? 52 : 60;

  return (
    <View style={[styles.wrap, { height, marginHorizontal: -authHorizontalPad }, style]}>
      <Image source={AUTH_HERO} style={[styles.image, { height }]} resizeMode="cover" accessibilityIgnoresInvertColors />
      <View style={styles.overlay} />
      <View style={styles.fadeBottom} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image
          source={AUTH_LOGO}
          style={{ width: logoSize, height: logoSize }}
          resizeMode="contain"
          accessibilityLabel="PDX Expense logo"
        />
        {headerRight ?? <View style={styles.headerSpacer} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SCREEN_WIDTH,
    overflow: "hidden",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  fadeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 96,
    backgroundColor: AUTH_BG,
    opacity: 0.92,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: authHorizontalPad,
    paddingBottom: 8,
  },
  headerSpacer: { width: 52 },
});
