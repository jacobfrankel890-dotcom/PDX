import { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format, isValid, parseISO } from "date-fns";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../lib/settings-context";
import { radius, spacing, type ThemeColors } from "../constants/theme";

type Props = {
  label?: string;
  value: string;
  onChange: (isoDate: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  embedded?: boolean;
  onPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

function parseValue(value: string): Date {
  if (value) {
    try {
      const d = parseISO(value);
      if (isValid(d)) return d;
    } catch {
      /* fall through */
    }
  }
  return new Date();
}

function formatDisplay(value: string): string {
  if (!value) return "Select date";
  try {
    return format(parseISO(value), "MMMM d, yyyy");
  } catch {
    return value;
  }
}

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  disabled,
  embedded,
  onPress,
  containerStyle,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [showPicker, setShowPicker] = useState(false);

  const dateValue = useMemo(() => parseValue(value), [value]);

  function openPicker() {
    if (disabled) return;
    onPress?.();
    setShowPicker(true);
  }

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (event.type === "dismissed") return;
    }
    if (selected) {
      onChange(format(selected, "yyyy-MM-dd"));
    }
  }

  function closeIosPicker() {
    setShowPicker(false);
  }

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={[styles.trigger, embedded && styles.triggerEmbedded, disabled && styles.disabled]}
        onPress={openPicker}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}, ${formatDisplay(value)}` : formatDisplay(value)}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>{formatDisplay(value)}</Text>
        <Text style={styles.icon}>📅</Text>
      </Pressable>

      {Platform.OS === "android" && showPicker ? (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal visible={showPicker} transparent animationType="slide" onRequestClose={closeIosPicker}>
          <Pressable style={styles.backdrop} onPress={closeIosPicker} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label ?? "Date"}</Text>
              <Pressable onPress={closeIosPicker} hitSlop={8}>
                <Text style={styles.doneBtn}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={dateValue}
              mode="date"
              display="inline"
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              themeVariant={isDark ? "dark" : "light"}
              style={styles.iosPicker}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    label: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginLeft: 2 },
    trigger: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 13,
      gap: 8,
    },
    triggerEmbedded: {
      backgroundColor: "transparent",
      borderWidth: 0,
      borderRadius: 0,
      paddingHorizontal: 2,
      paddingVertical: 10,
    },
    disabled: { opacity: 0.5 },
    value: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
    placeholder: { color: colors.slate400, fontWeight: "500" },
    icon: { fontSize: 18 },
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingTop: spacing.md,
      paddingHorizontal: spacing.md,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
    },
    sheetTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
    doneBtn: { fontSize: 16, fontWeight: "700", color: colors.primary },
    iosPicker: { alignSelf: "center", width: "100%" },
  });
}
