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

/** Home header: wordmark row, then greeting. */
export function AppScreenHeader({ title, topInset, style, avatarInitial, onAvatarPress }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={[styles.wrap, { paddingTop: topInset + 6 }, style]}>
      <View style={styles.topRow}>
        <PdxLogo size="lg" />
        {onAvatarPress && avatarInitial ? (
          <Pressable onPress={onAvatarPress} style={styles.avatar} accessibilityRole="button">
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: spacing.md,
      paddingBottom: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 8,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.4,
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
    avatarText: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 16,
    },
  });
}
