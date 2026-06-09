import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../lib/settings-context";
import { spacing, type ThemeColors } from "../constants/theme";
import { PdxLogo } from "./PdxLogo";

type Props = {
  title: string;
  subtitle?: string;
  topInset: number;
  style?: StyleProp<ViewStyle>;
  avatarInitial?: string;
  onAvatarPress?: () => void;
};

export function AppScreenHeader({
  title,
  subtitle,
  topInset,
  style,
  avatarInitial,
  onAvatarPress,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={[styles.wrap, { paddingTop: topInset + spacing.sm }, style]}>
      <View style={styles.logoRow}>
        <PdxLogo size="app" />
        {onAvatarPress && avatarInitial ? (
          <Pressable onPress={onAvatarPress} style={styles.avatar} accessibilityRole="button">
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    logoRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.6,
      lineHeight: 34,
    },
    subtitle: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.textSecondary,
      lineHeight: 21,
      marginTop: -2,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.greenLight,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.primary,
    },
    avatarText: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 18,
    },
  });
}
