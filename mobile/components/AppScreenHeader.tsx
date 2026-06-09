import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../lib/settings-context";
import { spacing, type ThemeColors } from "../constants/theme";
import { PdxLogo } from "./PdxLogo";

type Props = {
  title: string;
  topInset: number;
  style?: StyleProp<ViewStyle>;
  avatarInitial?: string;
  onAvatarPress?: () => void;
};

/** Compact home header: logo + greeting + avatar on one row. */
export function AppScreenHeader({ title, topInset, style, avatarInitial, onAvatarPress }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={[styles.wrap, { paddingTop: topInset + 4 }, style]}>
      <PdxLogo size="md" />
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {onAvatarPress && avatarInitial ? (
        <Pressable onPress={onAvatarPress} style={styles.avatar} accessibilityRole="button">
          <Text style={styles.avatarText}>{avatarInitial}</Text>
        </Pressable>
      ) : (
        <View style={styles.avatarSpacer} />
      )}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: 10,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    title: {
      flex: 1,
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.3,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.greenLight,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.primary,
    },
    avatarSpacer: { width: 40 },
    avatarText: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 16,
    },
  });
}
