import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/settings-context";
import { radius, spacing, type ThemeColors } from "../constants/theme";

type Props = {
  step: number;
  total: number;
  labels: string[];
};

export function SignupStepIndicator({ step, total, labels }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[styles.dot, i <= step && styles.dotActive]} />
        ))}
      </View>
      <Text style={styles.label}>
        Step {step + 1} of {total} · {labels[step]}
      </Text>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { gap: spacing.sm, marginBottom: spacing.xs },
    track: { flexDirection: "row", gap: 8 },
    dot: {
      flex: 1,
      height: 4,
      borderRadius: radius.full,
      backgroundColor: colors.border,
    },
    dotActive: { backgroundColor: colors.primary },
    label: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
  });
}
