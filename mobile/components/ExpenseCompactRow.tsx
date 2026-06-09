import { Pressable, StyleSheet, Text, View } from "react-native";
import { format, parseISO } from "date-fns";
import { EXPENSE_CATEGORIES } from "../lib/categories";
import { getCategoryFromItem, type ExpenseEntry } from "../lib/expenses";
import { formatCurrency } from "../lib/types";
import { spacing, type ThemeColors } from "../constants/theme";

type Props = {
  item: ExpenseEntry;
  colors: ThemeColors;
  onPress: () => void;
  isLast?: boolean;
};

function formatDate(d: string | null | undefined): string {
  if (!d) return "No date";
  try {
    return format(parseISO(d), "MMM d, yyyy");
  } catch {
    return d;
  }
}

export function ExpenseCompactRow({ item, colors, onPress, isLast }: Props) {
  const cat = EXPENSE_CATEGORIES.find((c) => c.key === getCategoryFromItem(item)) ?? EXPENSE_CATEGORIES[6];
  const isPending = item.report_status === "draft";
  const styles = makeStyles(colors);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && styles.pressed]}
      onPress={onPress}
    >
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
        <Text style={[styles.amount, isPending && styles.amountPending]}>
          {formatCurrency(item.row_total ?? 0)}
        </Text>
        <Text style={[styles.status, isPending ? styles.statusPending : styles.statusSubmitted]}>
          {isPending ? "Pending" : "Submitted"}
        </Text>
      </View>
    </Pressable>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    pressed: { opacity: 0.7 },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    emoji: { fontSize: 18 },
    body: { flex: 1, minWidth: 0, gap: 3 },
    title: { fontSize: 16, fontWeight: "600", color: colors.text },
    meta: { fontSize: 13, color: colors.textSecondary },
    right: { alignItems: "flex-end", gap: 2 },
    amount: { fontSize: 15, fontWeight: "700", color: colors.text },
    amountPending: { color: colors.primary },
    status: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
    statusPending: { color: colors.primary },
    statusSubmitted: { color: colors.textSecondary },
  });
}
