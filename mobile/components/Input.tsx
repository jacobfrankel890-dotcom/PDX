import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { useTheme } from "../lib/settings-context";
import {
  AUTH_BORDER,
  AUTH_GRAY_60,
  AUTH_INPUT_BG,
  AUTH_WHITE,
} from "../constants/auth-chrome";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  tone?: "default" | "auth";
};

export function Input({ label, error, hint, style, tone = "default", ...props }: Props) {
  const { colors } = useTheme();
  const isAuth = tone === "auth";
  const styles = makeStyles(colors, isAuth);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={isAuth ? "rgba(255,255,255,0.35)" : colors.slate400}
        style={[styles.input, error && styles.inputError, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"], isAuth: boolean) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: isAuth ? AUTH_GRAY_60 : colors.textSecondary,
      letterSpacing: isAuth ? 0.2 : 0,
    },
    input: {
      borderWidth: 1,
      borderColor: isAuth ? AUTH_BORDER : colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 16,
      backgroundColor: isAuth ? AUTH_INPUT_BG : colors.bg,
      color: isAuth ? AUTH_WHITE : colors.text,
    },
    inputError: { borderColor: colors.error },
    error: { fontSize: 12, color: colors.error },
    hint: { fontSize: 12, color: isAuth ? AUTH_GRAY_60 : colors.slate500 },
  });
}
