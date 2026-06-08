import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  normalizeCategory,
  type ExpenseCategoryKey,
} from "../lib/categories";
import { colors, radius, spacing } from "../constants/theme";

type Props = {
  value: ExpenseCategoryKey | string;
  onChange: (value: ExpenseCategoryKey) => void;
  embedded?: boolean;
};

export function CategoryPicker({ value, onChange, embedded }: Props) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const selected = normalizeCategory(String(value));

  return (
    <>
      <Pressable style={[styles.trigger, embedded && styles.triggerEmbedded]} onPress={() => setOpen(true)}>
        <Text style={styles.triggerLabel}>Category</Text>
        <Text style={styles.triggerValue} numberOfLines={1}>
          {EXPENSE_CATEGORY_LABELS[selected]}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <Text style={styles.sheetTitle}>Select category</Text>
          <ScrollView>
            {EXPENSE_CATEGORIES.map((c) => {
              const active = c.key === selected;
              return (
                <Pressable
                  key={c.key}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    onChange(c.key);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionEmoji}>{c.emoji}</Text>
                  <View style={styles.optionTextWrap}>
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{c.label}</Text>
                    <Text style={styles.optionShort}>{c.shortLabel}</Text>
                  </View>
                  {active ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  triggerEmbedded: {
    backgroundColor: "transparent",
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 2,
    paddingVertical: 10,
  },
  triggerLabel: { fontSize: 13, fontWeight: "600", color: colors.slate500 },
  triggerValue: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.slate800, textAlign: "right" },
  chevron: { fontSize: 14, color: colors.slate500 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    maxHeight: "72%",
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.primary, marginBottom: spacing.md },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    marginBottom: 4,
    gap: 12,
  },
  optionActive: { backgroundColor: "#e8eef5" },
  optionEmoji: { fontSize: 22, width: 28, textAlign: "center" },
  optionTextWrap: { flex: 1, gap: 2 },
  optionText: { fontSize: 16, color: colors.slate800 },
  optionTextActive: { color: colors.primary, fontWeight: "600" },
  optionShort: { fontSize: 12, color: colors.slate500 },
  check: { color: colors.primary, fontWeight: "700", fontSize: 16 },
});
