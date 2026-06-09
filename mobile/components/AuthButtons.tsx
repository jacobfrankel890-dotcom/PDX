import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { AUTH_BG, AUTH_BORDER, AUTH_WHITE_90 } from "../constants/auth-chrome";
import { grid } from "../lib/grid";
import { radius } from "../constants/theme";

type BtnProps = {
  label: string;
  icon?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function AuthPrimaryButton({ label, icon, onPress, style }: BtnProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.primary, pressed && styles.pressed, style]}
      onPress={onPress}
    >
      <Text style={styles.primaryText}>{label}</Text>
      {icon ? <Text style={styles.primaryIcon}>{icon}</Text> : null}
    </Pressable>
  );
}

export function AuthOutlineButton({ label, icon, onPress, style }: BtnProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.outline, pressed && styles.pressed, style]}
      onPress={onPress}
    >
      {icon ? <Text style={styles.outlineIcon}>{icon}</Text> : null}
      <Text style={styles.outlineText}>{label}</Text>
    </Pressable>
  );
}

export function AuthSectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    minWidth: 236,
    height: 52,
    paddingHorizontal: grid(3.5),
    borderRadius: radius.lg,
    backgroundColor: "#99C221",
    gap: 8,
  },
  primaryText: {
    color: AUTH_BG,
    fontSize: 16,
    fontWeight: "800",
  },
  primaryIcon: {
    color: AUTH_BG,
    fontSize: 18,
    fontWeight: "800",
  },
  outline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    minWidth: 236,
    height: 50,
    paddingHorizontal: grid(3.5),
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.32)",
    backgroundColor: "rgba(0,0,0,0.34)",
    gap: 8,
  },
  outlineIcon: {
    color: AUTH_WHITE_90,
    fontSize: 16,
    fontWeight: "700",
  },
  outlineText: {
    color: AUTH_WHITE_90,
    fontSize: 16,
    fontWeight: "700",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: grid(1),
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
