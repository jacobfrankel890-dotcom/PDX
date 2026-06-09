import { StyleSheet, View } from "react-native";
import { useTheme } from "../lib/settings-context";
import { radius, spacing } from "../constants/theme";

function Block({ width, height, style }: { width: number | `${number}%`; height: number; style?: object }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius.sm,
          backgroundColor: colors.border,
          opacity: 0.55,
        },
        style,
      ]}
    />
  );
}

export function DashboardSkeleton() {
  const { colors } = useTheme();
  const styles = makeStyles(colors.surface, colors.border);

  return (
    <View style={styles.root}>
      <View style={styles.stats}>
        <Block width={88} height={18} />
        <Block width={64} height={18} />
        <Block width={72} height={18} />
      </View>
      <Block width="100%" height={44} style={{ borderRadius: radius.md }} />
      <View style={styles.chips}>
        <Block width={48} height={28} style={{ borderRadius: radius.full }} />
        <Block width={64} height={28} style={{ borderRadius: radius.full }} />
        <Block width={56} height={28} style={{ borderRadius: radius.full }} />
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.card}>
          <Block width={40} height={56} style={{ borderRadius: 0 }} />
          <View style={styles.cardBody}>
            <Block width="70%" height={14} />
            <Block width="45%" height={11} style={{ marginTop: 8 }} />
          </View>
          <Block width={52} height={16} />
        </View>
      ))}
    </View>
  );
}

function makeStyles(surface: string, border: string) {
  return StyleSheet.create({
    root: { padding: spacing.md, gap: spacing.sm },
    stats: {
      flexDirection: "row",
      gap: spacing.sm,
      backgroundColor: surface,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: border,
    },
    chips: { flexDirection: "row", gap: 8 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: border,
      overflow: "hidden",
      paddingRight: spacing.md,
    },
    cardBody: { flex: 1, paddingVertical: spacing.md },
  });
}
