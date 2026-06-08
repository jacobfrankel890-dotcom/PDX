import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AUTH_GRAY_60, authHorizontalPad } from "../constants/auth-chrome";
import { grid } from "../lib/grid";

/** PDX wordmark only — never use the tire photo here. */
const PDX_WORDMARK = require("../assets/auth-header-wordmark.png");
const WORDMARK_ASPECT = 131 / 400;

type Props = {
  compact?: boolean;
};

export function AuthLogoHeader({ compact }: Props) {
  const insets = useSafeAreaInsets();
  const logoW = compact ? 108 : 124;
  const logoH = Math.round(logoW * WORDMARK_ASPECT);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 10 }]}>
      <Image
        source={PDX_WORDMARK}
        style={{ width: logoW, height: logoH }}
        resizeMode="contain"
        accessibilityLabel="PDX Expense"
      />
      <Text style={styles.tagline}>Expense</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: authHorizontalPad,
    marginBottom: grid(2),
    zIndex: 1,
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
