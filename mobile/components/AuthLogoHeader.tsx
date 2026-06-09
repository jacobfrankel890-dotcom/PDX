import { StyleSheet, View } from "react-native";
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
    marginBottom: grid(1.25),
  },
});
