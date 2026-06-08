import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AUTH_GRAY_60, AUTH_LOGO_ASPECT, authHorizontalPad } from "../constants/auth-chrome";
import { grid } from "../lib/grid";

/** Fresh require path so OTA/cache cannot swap this with the hero image. */
const PDX_WORDMARK = require("../assets/pdx-wordmark.png");

type Props = {
  compact?: boolean;
};

export function AuthLogoHeader({ compact }: Props) {
  const insets = useSafeAreaInsets();
  const logoWidth = compact ? 120 : 136;
  const logoHeight = Math.round(logoWidth * AUTH_LOGO_ASPECT);

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 10,
          paddingHorizontal: authHorizontalPad,
          paddingBottom: grid(2),
        },
      ]}
    >
      <Image
        source={PDX_WORDMARK}
        style={{ width: logoWidth, height: logoHeight }}
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
