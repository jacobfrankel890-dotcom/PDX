import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authHorizontalPad } from "../constants/auth-chrome";
import { grid } from "../lib/grid";
import { PdxLogo } from "./PdxLogo";

type Props = {
  compact?: boolean;
};

/** Text logo only — no image assets (prevents wordmark/tire mix-ups). */
export function AuthLogoHeader({ compact }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 10 }]}>
      <PdxLogo size={compact ? "md" : "lg"} tagline="Expense" onDark />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: authHorizontalPad,
    marginBottom: grid(2),
    zIndex: 1,
  },
});
