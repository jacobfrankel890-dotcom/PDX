import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AUTH_LOGO, AUTH_LOGO_ASPECT, AUTH_GRAY_60, authHorizontalPad } from "../constants/auth-chrome";
import { grid } from "../lib/grid";

type Props = {
  compact?: boolean;
};

/** Official PDX wordmark + Expense tagline over the auth backdrop. */
export function AuthLogoHeader({ compact }: Props) {
  const insets = useSafeAreaInsets();
  const logoWidth = compact ? 96 : 112;
  const logoHeight = Math.round(logoWidth * AUTH_LOGO_ASPECT);

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 10,
          paddingHorizontal: authHorizontalPad,
          paddingBottom: grid(3),
        },
      ]}
    >
      <Image
        source={AUTH_LOGO}
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
    gap: 4,
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
