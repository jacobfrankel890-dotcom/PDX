import { useEffect, useRef, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../lib/settings-context";
import { radius, spacing, type ThemeColors } from "../constants/theme";
import { PdxLogo } from "./PdxLogo";
import { LogisticsHero } from "./LogisticsHero";
import { grid } from "../lib/grid";

const FEATURES = ["Scan receipts", "Track mileage", "Submit fast"] as const;

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scrollKey?: string | number;
};

export function AuthScreenShell({ title, subtitle, children, footer, contentStyle, scrollKey }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollKey === undefined) return;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [scrollKey]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + grid(2), paddingBottom: insets.bottom + grid(3) },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <LogisticsHero />
          <View style={styles.logoOverlay}>
            <PdxLogo size="md" tagline="Expense" style={styles.logoCenter} />
          </View>
        </View>

        <View style={styles.chipRow}>
          {FEATURES.map((label) => (
            <View key={label} style={styles.chip}>
              <Text style={styles.chipText}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.headingBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <View style={styles.card}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: grid(3),
      gap: grid(2),
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      paddingTop: grid(2),
      paddingBottom: grid(1),
      paddingHorizontal: grid(2),
      gap: grid(1),
    },
    logoOverlay: {
      alignItems: "center",
      paddingTop: grid(1),
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    logoCenter: { alignItems: "center" },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: grid(1),
      justifyContent: "center",
    },
    chip: {
      paddingHorizontal: grid(1.5),
      paddingVertical: grid(0.75),
      backgroundColor: colors.greenLight,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: 0.3,
    },
    headingBlock: { gap: grid(0.5), paddingHorizontal: grid(1) },
    title: { fontSize: 26, fontWeight: "800", color: colors.text, textAlign: "center" },
    subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: "center", lineHeight: 22 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.md,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 2,
    },
    footer: { alignItems: "center", paddingTop: grid(1) },
  });
}
