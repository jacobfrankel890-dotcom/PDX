import { forwardRef, useRef, type ComponentProps, type Ref } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../lib/settings-context";
import { useAuthFormScroll, type AuthScrollMode } from "../lib/auth-form-scroll";
import {
  AUTH_BORDER,
  AUTH_GRAY_60,
  AUTH_INPUT_BG,
  AUTH_WHITE,
} from "../constants/auth-chrome";

type Props = ComponentProps<typeof TextInput> & {
  label?: string;
  error?: string;
  hint?: string;
  tone?: "default" | "auth";
  scrollOnFocus?: boolean;
  scrollMode?: AuthScrollMode;
};

export const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    style,
    tone = "default",
    scrollOnFocus = true,
    scrollMode = "default",
    onFocus,
    ...props
  }: Props,
  ref: Ref<TextInput>
) {
  const { colors } = useTheme();
  const isAuth = tone === "auth";
  const styles = makeStyles(colors, isAuth);
  const wrapRef = useRef<View>(null);
  const authScroll = useAuthFormScroll();

  return (
    <View ref={wrapRef} style={styles.wrap} collapsable={false}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={isAuth ? "rgba(255,255,255,0.35)" : colors.slate400}
        style={[styles.input, error && styles.inputError, style]}
        onFocus={(event) => {
          if (scrollOnFocus && authScroll) {
            authScroll.scrollToField(wrapRef, scrollMode);
          }
          onFocus?.(event);
        }}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

function makeStyles(colors: ReturnType<typeof useTheme>["colors"], isAuth: boolean) {
  return StyleSheet.create({
    wrap: { gap: isAuth ? 8 : 6 },
    label: {
      fontSize: isAuth ? 14 : 13,
      fontWeight: "600",
      color: isAuth ? AUTH_WHITE : colors.textSecondary,
      letterSpacing: isAuth ? 0.2 : 0,
    },
    input: {
      borderWidth: 1,
      borderColor: isAuth ? AUTH_BORDER : colors.border,
      borderRadius: isAuth ? 16 : 14,
      paddingHorizontal: 14,
      paddingVertical: isAuth ? 14 : 13,
      fontSize: 16,
      backgroundColor: isAuth ? AUTH_INPUT_BG : colors.bg,
      color: isAuth ? AUTH_WHITE : colors.text,
    },
    inputError: { borderColor: colors.error },
    error: { fontSize: 12, color: colors.error },
    hint: { fontSize: 12, color: isAuth ? AUTH_GRAY_60 : colors.slate500 },
  });
}
