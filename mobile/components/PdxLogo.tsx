import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../lib/settings-context";
import { AUTH_GRAY_60 } from "../constants/auth-chrome";

export type PdxLogoSize = "sm" | "md" | "lg" | "xl" | "app";

type Props = {
  size?: PdxLogoSize;
  tagline?: string;
  style?: StyleProp<ViewStyle>;
  /** Auth screens on dark backgrounds. */
  onDark?: boolean;
};

const LOGO_HEIGHT: Record<PdxLogoSize, number> = {
  sm: 22,
  md: 28,
  lg: 36,
  xl: 44,
  app: 28,
};

const TAGLINE: Record<PdxLogoSize, number> = {
  sm: 10,
  md: 11,
  lg: 12,
  xl: 13,
  app: 11,
};

/** Aspect ratio of `assets/pdx-logo.png` */
const WORDMARK_ASPECT = 3.15;

export function PdxLogo({ size = "md", tagline, style, onDark }: Props) {
  const { colors } = useTheme();
  const height = LOGO_HEIGHT[size];
  const taglineColor = onDark ? AUTH_GRAY_60 : colors.textSecondary;

  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={require("../assets/pdx-logo.png")}
        style={{ height, width: height * WORDMARK_ASPECT }}
        resizeMode="contain"
        accessibilityLabel="PDX Expense"
      />
      {tagline ? (
        <Text style={[styles.tagline, { fontSize: TAGLINE[size], color: taglineColor }]}>{tagline}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "flex-start" },
  tagline: {
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 2,
  },
});
