import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../lib/settings-context";

export type PdxLogoSize = "sm" | "md" | "lg" | "xl";

type Props = {
  size?: PdxLogoSize;
  /** Small grey subtitle under the logo, e.g. "Expense" */
  tagline?: string;
  style?: StyleProp<ViewStyle>;
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

export function PdxLogo({ size = "md", tagline, style }: Props) {
  const { colors } = useTheme();
  const fontSize = SIZES[size];

  return (
    <View style={[styles.wrap, style]}>
      <Text style={[styles.logo, { fontSize }]}>
        <Text style={[styles.pd, { color: colors.text }]}>PD</Text>
        <Text style={[styles.x, { color: colors.primary }]}>X</Text>
      </Text>
      {tagline ? (
        <Text style={[styles.tagline, { fontSize: TAGLINE[size], color: colors.textSecondary }]}>{tagline}</Text>
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
