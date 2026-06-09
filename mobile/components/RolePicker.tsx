import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ROLES, type UserRole } from "../lib/types";
import { useTheme } from "../lib/settings-context";
import { radius, spacing } from "../constants/theme";

type Props = {
  value: UserRole | string;
  onChange: (value: UserRole) => void;
};

export function RolePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const selected = ROLES.find((r) => r.value === value)?.value ?? "kam";

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <View style={styles.triggerText}>
          <Text style={styles.triggerLabel}>Default position</Text>
          <Text style={styles.triggerValue} numberOfLines={2}>
            {ROLES.find((r) => r.value === selected)?.label ?? value}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <Text style={styles.sheetTitle}>Default position</Text>
          <ScrollView>
            {ROLES.map((role) => {
              const active = role.value === selected;
              return (
                <Pressable
                  key={role.value}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    onChange(role.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{role.label}</Text>
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

function makeStyles(colors: ReturnType<typeof useTheme>["colors"], isDark: boolean) {
  return StyleSheet.create({
    trigger: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: spacing.md,
      gap: spacing.md,
    },
    triggerText: { flex: 1, gap: 2 },
    triggerLabel: { fontSize: 16, fontWeight: "600", color: colors.text },
    triggerValue: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    chevron: { fontSize: 20, color: colors.slate400, fontWeight: "300" },
    backdrop: { flex: 1, backgroundColor: isDark ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.4)" },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.md,
      maxHeight: "60%",
      borderTopWidth: 1,
      borderColor: colors.border,
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
    optionText: { flex: 1, fontSize: 16, color: colors.text, fontWeight: "500" },
    optionTextActive: { color: colors.primary, fontWeight: "700" },
    check: { color: colors.primary, fontWeight: "700", fontSize: 16 },
  });
}
