import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { useTheme } from "../lib/settings-context";
import { hapticLight } from "../lib/haptics";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "outline" | "ghost";
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, loading, variant = "primary", disabled, style }: Props) {
  const { colors } = useTheme();
  const isOutline = variant === "outline";
  const isGhost = variant === "ghost";
  const isPrimary = !isOutline && !isGhost;

  return (
    <Pressable
      onPress={() => {
        hapticLight();
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary && { backgroundColor: colors.primary },
        isOutline && { borderColor: colors.primary },
        isOutline && styles.outline,
        isGhost && styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.onPrimary : colors.primary} />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary && { color: colors.onPrimary },
            (isOutline || isGhost) && { color: colors.primary },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 2,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.88 },
  text: { fontWeight: "700", fontSize: 16 },
});
