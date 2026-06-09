import { ReactNode } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { useTheme } from "../lib/settings-context";
import { radius, type ThemeColors } from "../constants/theme";

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={[styles.card, style]}>{children}</View>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <Text style={styles.title}>{children}</Text>;
}

export function CardDescription({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <Text style={styles.desc}>{children}</Text>;
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: { fontSize: 20, fontWeight: "700", color: colors.primary },
    desc: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  });
}
