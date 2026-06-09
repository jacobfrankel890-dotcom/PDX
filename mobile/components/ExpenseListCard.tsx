import { Pressable, StyleSheet, Text, View } from "react-native";
import { format, parseISO } from "date-fns";
import { EXPENSE_CATEGORIES } from "../lib/categories";
import { getCategoryFromItem, getCategoryLabel, type ExpenseEntry } from "../lib/expenses";
import { formatCurrency, getCompanyLabel } from "../lib/types";
import { radius, spacing, type ThemeColors } from "../constants/theme";

type Props = {
  item: ExpenseEntry;
  colors: ThemeColors;
  onPress: () => void;
};

function formatExpenseDate(d: string | null | undefined): string {
  if (!d) return "";
  try {
    return format(parseISO(d), "MMM d");
  } catch {
    return d;
  }
}

function StatusBadge({ status, colors }: { status?: string; colors: ThemeColors }) {
  const isDraft = status === "draft";
  return (
    <View style={[styles.badge, isDraft ? styles.badgeDraft : styles.badgeSubmitted]}>
      <Text style={[styles.badgeText, isDraft ? styles.badgeTextDraft : styles.badgeTextSubmitted]}>
        {isDraft ? "Pending" : status === "submitted" ? "Submitted" : status ?? ""}
      </Text>
    </View>
  );
}

export function ExpenseListCard({ item, colors, onPress }: Props) {
  const styles = makeStyles(colors);

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <View style={styles.stripe}>
        <Text style={styles.stripeEmoji}>
          {EXPENSE_CATEGORIES.find((c) => c.key === getCategoryFromItem(item))?.emoji ?? "📋"}
        </Text>
      </View>
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={1}>
          {item.description || "Expense"}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {getCategoryLabel(item)}
          {item.company ? ` · ${getCompanyLabel(item.company)}` : ""}
          {item.expense_date ? ` · ${formatExpenseDate(item.expense_date)}` : ""}
        </Text>
        {item.related_to ? (
          <Text style={styles.related} numberOfLines={1}>
            Related to: {item.related_to}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{formatCurrency(item.row_total)}</Text>
        <StatusBadge status={item.report_status} colors={colors} />
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm,
      gap: spacing.sm,
    },
    cardPressed: { opacity: 0.92 },
    stripe: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.greenLight,
      alignItems: "center",
      justifyContent: "center",
    },
    stripeEmoji: { fontSize: 18 },
    main: { flex: 1, minWidth: 0, gap: 2 },
    title: { fontSize: 15, fontWeight: "700", color: colors.text },
    meta: { fontSize: 12, color: colors.textSecondary },
    related: { fontSize: 11, color: colors.primary, fontWeight: "600" },
    right: { alignItems: "flex-end", gap: 4 },
    amount: { fontSize: 15, fontWeight: "800", color: colors.primary },
    chevron: { fontSize: 22, color: colors.textSecondary, marginLeft: 2 },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.full,
    },
    badgeDraft: { backgroundColor: colors.greenLight },
    badgeSubmitted: { backgroundColor: colors.border },
    badgeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
    badgeTextDraft: { color: colors.primaryDark },
    badgeTextSubmitted: { color: colors.textSecondary },
  });
}
