import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COMPANIES, getCompanyLabel, normalizeCompanyValue, type CompanyValue } from "../lib/types";
import { useTheme } from "../lib/settings-context";
import { radius, spacing } from "../constants/theme";

type Props = {
  value: CompanyValue | string;
  onChange: (value: CompanyValue) => void;
  embedded?: boolean;
};

export function CompanyPicker({ value, onChange, embedded }: Props) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const normalizedValue = normalizeCompanyValue(String(value));

  return (
    <>
      <Pressable style={[styles.trigger, embedded && styles.triggerEmbedded]} onPress={() => setOpen(true)}>
        <Text style={styles.triggerLabel}>Company</Text>
        <Text style={styles.triggerValue} numberOfLines={1}>
          {getCompanyLabel(String(value))}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <Text style={styles.sheetTitle}>Select company</Text>
          <ScrollView>
            {COMPANIES.map((c) => {
              const active = c.value === normalizedValue;
              return (
                <Pressable
                  key={c.value}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    onChange(c.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{c.label}</Text>
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

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
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
  },
  optionActive: { backgroundColor: colors.greenLight },
  optionText: { flex: 1, fontSize: 16, color: colors.slate800 },
  optionTextActive: { color: colors.primary, fontWeight: "600" },
  check: { color: colors.primary, fontWeight: "700", fontSize: 16 },
  });
}
