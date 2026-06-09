import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { EXPENSE_CATEGORIES } from "../lib/categories";
import { getCategoryFromItem, type ExpenseEntry } from "../lib/expenses";
import { formatCurrency } from "../lib/types";
import { spacing, type ThemeColors } from "../constants/theme";

type Props = {
  item: ExpenseEntry;
  colors: ThemeColors;
  onPress: () => void;
};

function formatDate(d: string | null | undefined): string {
  if (!d) return "No date";
  try {
    return format(parseISO(d), "MMM d");
  } catch {
    return d;
  }
}

export function ExpenseCompactRow({ item, colors, onPress }: Props) {
  const cat = EXPENSE_CATEGORIES.find((c) => c.key === getCategoryFromItem(item)) ?? EXPENSE_CATEGORIES[6];
  const isPending = item.report_status === "draft";
  const styles = makeStyles(colors);

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.icon}>
        <Text style={styles.emoji}>{cat.emoji}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {item.description || "Expense"}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatDate(item.expense_date)} · {cat.shortLabel}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{formatCurrency(item.row_total ?? 0)}</Text>
        <View style={[styles.dot, isPending ? styles.dotPending : styles.dotSubmitted]} />
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    pressed: { backgroundColor: colors.greenLight },
    icon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    emoji: { fontSize: 16 },
    body: { flex: 1, minWidth: 0, gap: 2 },
    title: { fontSize: 15, fontWeight: "600", color: colors.text },
    meta: { fontSize: 12, color: colors.textSecondary },
    right: { alignItems: "flex-end", gap: 4, marginRight: 2 },
    amount: { fontSize: 14, fontWeight: "800", color: colors.primary },
    dot: { width: 8, height: 8, borderRadius: 4 },
    dotPending: { backgroundColor: colors.primary },
    dotSubmitted: { backgroundColor: colors.textSecondary },
  });
}
