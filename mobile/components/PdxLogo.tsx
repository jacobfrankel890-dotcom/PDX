import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../lib/settings-context";
import {
  AUTH_GRAY_60,
  AUTH_INPUT_BG,
  AUTH_BORDER,
  AUTH_WHITE,
} from "../constants/auth-chrome";

export type PdxLogoSize = "sm" | "md" | "lg" | "xl";

type Props = {
  size?: PdxLogoSize;
  tagline?: string;
  style?: StyleProp<ViewStyle>;
  onDark?: boolean;
};

const SIZES: Record<PdxLogoSize, number> = {
  sm: 22,
  md: 30,
  lg: 40,
  xl: 52,
};

const TAGLINE: Record<PdxLogoSize, number> = {
  sm: 10,
  md: 11,
  lg: 12,
  xl: 13,
};

export function PdxLogo({ size = "md", tagline, style, onDark }: Props) {
  const { colors } = useTheme();
  const fontSize = SIZES[size];
  const pdColor = onDark ? AUTH_WHITE : colors.text;
  const taglineColor = onDark ? AUTH_GRAY_60 : colors.textSecondary;

  return (
    <View style={[styles.wrap, style]}>
      <Text style={[styles.logo, { fontSize }]}>
        <Text style={[styles.pd, { color: pdColor }]}>PD</Text>
        <Text style={[styles.x, { color: colors.primary }]}>X</Text>
      </Text>
      {tagline ? (
        <Text style={[styles.tagline, { fontSize: TAGLINE[size], color: taglineColor }]}>{tagline}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "flex-start" },
  logo: {
    fontStyle: "italic",
    fontWeight: "800",
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  pd: {},
  x: {},
  tagline: {
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 2,
  },
});
