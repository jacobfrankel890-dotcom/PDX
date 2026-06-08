import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/settings-context";
import { spacing, type ThemeColors } from "../constants/theme";
import { PdxLogo } from "./PdxLogo";

type Props = {
  title: string;
  onClose: () => void;
  showLogo?: boolean;
};

export function ScreenHeader({ title, onClose, showLogo = true }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.bar}>
      <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
        <Text style={styles.closeIcon}>✕</Text>
      </Pressable>
      <View style={styles.center}>
        {showLogo ? <PdxLogo size="sm" style={styles.logo} /> : null}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={styles.closeBtn} />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    bar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeBtn: { width: 32, alignItems: "center" },
    closeIcon: { color: colors.textSecondary, fontSize: 22, fontWeight: "300" },
    center: { flex: 1, alignItems: "center", gap: 2 },
    logo: { alignItems: "center" },
    title: { color: colors.text, fontSize: 15, fontWeight: "700" },
  });
}
