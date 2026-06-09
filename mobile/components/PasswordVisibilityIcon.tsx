import { StyleSheet, View } from "react-native";

type Props = {
  visible: boolean;
  color: string;
};

/** Minimal eye / eye-off icon drawn with Views (no icon font dependency). */
export function PasswordVisibilityIcon({ visible, color }: Props) {
  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no">
      <View style={[styles.eye, { borderColor: color }]}>
        <View style={[styles.pupil, { backgroundColor: color }]} />
      </View>
      {!visible ? <View style={[styles.slash, { backgroundColor: color }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  eye: {
    width: 20,
    height: 12,
    borderRadius: 10,
    borderWidth: 1.75,
    alignItems: "center",
    justifyContent: "center",
  },
  pupil: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  slash: {
    position: "absolute",
    width: 22,
    height: 1.75,
    borderRadius: 1,
    transform: [{ rotate: "-40deg" }],
  },
});
