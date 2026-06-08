import { StyleSheet, View } from "react-native";
import { authHorizontalPad } from "../constants/auth-chrome";
import { grid } from "../lib/grid";
import { PdxLogo } from "./PdxLogo";

type Props = {
  compact?: boolean;
};

export function AuthLogoHeader({ compact }: Props) {
  return (
    <View style={styles.wrap}>
      <PdxLogo size={compact ? "md" : "lg"} tagline="Expense" onDark />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: authHorizontalPad,
    marginBottom: grid(2),
  },
});
