import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AUTH_HERO, SCREEN_WIDTH, authHeroHeight, authHorizontalPad } from "../constants/auth-chrome";
import { PdxLogo } from "./PdxLogo";

type Props = {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  headerRight?: React.ReactNode;
};

export function AuthHero({ compact, style, headerRight }: Props) {
  const insets = useSafeAreaInsets();
  const height = authHeroHeight(compact);

  return (
    <View style={[styles.wrap, { height, marginHorizontal: -authHorizontalPad }, style]}>
      <Image source={AUTH_HERO} style={[styles.image, { height }]} resizeMode="cover" accessibilityIgnoresInvertColors />
      <View style={styles.overlay} />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <PdxLogo size={compact ? "md" : "lg"} tagline="Expense" onDark />
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
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: authHorizontalPad,
    paddingBottom: 8,
  },
  headerSpacer: { width: 72 },
});
