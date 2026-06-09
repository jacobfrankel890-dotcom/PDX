import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { EXPENSE_CATEGORIES } from "../lib/categories";
import {
  EXPENSE_SORT_OPTIONS,
  type ExpenseSortKey,
} from "../lib/expense-filters";
import type { ExpenseCategory } from "../lib/expenses";
import { hapticSelection } from "../lib/haptics";
import { radius, spacing, type ThemeColors } from "../constants/theme";

type Props = {
  visible: boolean;
  colors: ThemeColors;
  category: ExpenseCategory | "all";
  sort: ExpenseSortKey;
  onCategoryChange: (value: ExpenseCategory | "all") => void;
  onSortChange: (value: ExpenseSortKey) => void;
  onClear: () => void;
  onClose: () => void;
};

export function ExpenseFilterSheet({
  visible,
  colors,
  category,
  sort,
  onCategoryChange,
  onSortChange,
  onClear,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const hasAdvanced = category !== "all" || sort !== "newest";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Filter & sort</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.grid}>
            <Pressable
              style={[styles.option, category === "all" && styles.optionActive]}
              onPress={() => {
                hapticSelection();
                onCategoryChange("all");
              }}
            >
              <Text style={[styles.optionText, category === "all" && styles.optionTextActive]}>All</Text>
            </Pressable>
            {EXPENSE_CATEGORIES.map((cat) => (
              <Pressable
                key={cat.key}
                style={[styles.option, category === cat.key && styles.optionActive]}
                onPress={() => {
                  hapticSelection();
                  onCategoryChange(cat.key);
                }}
              >
                <Text style={styles.optionEmoji}>{cat.emoji}</Text>
                <Text style={[styles.optionText, category === cat.key && styles.optionTextActive]}>
                  {cat.shortLabel}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Sort by</Text>
          <View style={styles.sortList}>
            {EXPENSE_SORT_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                style={[styles.sortRow, sort === option.key && styles.sortRowActive]}
                onPress={() => {
                  hapticSelection();
                  onSortChange(option.key);
                }}
              >
                <Text style={[styles.sortText, sort === option.key && styles.sortTextActive]}>
                  {option.label}
                </Text>
                {sort === option.key ? (
                  <Ionicons name="checkmark" size={18} color={colors.primaryDark} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {hasAdvanced ? (
            <Pressable style={styles.clearBtn} onPress={onClear}>
              <Text style={styles.clearText}>Reset filters</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: "78%",
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
    },
    handle: {
      alignSelf: "center",
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginTop: 10,
      marginBottom: 4,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    title: { fontSize: 18, fontWeight: "700", color: colors.text },
    content: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
    label: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: spacing.sm,
      marginBottom: 4,
    },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radius.full,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    optionEmoji: { fontSize: 14 },
    optionText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
    optionTextActive: { color: colors.onPrimary },
    sortList: { gap: 6 },
    sortRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      borderRadius: radius.md,
      backgroundColor: colors.bg,
    },
    sortRowActive: { backgroundColor: colors.greenLight },
    sortText: { fontSize: 15, fontWeight: "500", color: colors.text },
    sortTextActive: { fontWeight: "700", color: colors.primaryDark },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    clearBtn: { paddingVertical: 14, paddingHorizontal: spacing.md },
    clearText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
    doneBtn: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 14,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
    },
    doneText: { fontSize: 15, fontWeight: "700", color: colors.onPrimary },
  });
}
