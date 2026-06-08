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

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** When this value changes, the form scrolls back to the top (e.g. multi-step signup). */
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
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <PdxLogo size="lg" tagline="Expense" style={styles.logoCenter} />
          <View style={styles.heroAnim}>
            <LogisticsHero compact />
          </View>
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
      justifyContent: "center",
    },
    hero: { alignItems: "center", marginBottom: grid(2), gap: grid(2) },
    heroAnim: {
      width: "100%",
      alignItems: "center",
      paddingVertical: grid(1),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    logoCenter: { alignItems: "center" },
    title: { fontSize: 24, fontWeight: "800", color: colors.text, textAlign: "center" },
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
    footer: { marginTop: spacing.lg, alignItems: "center" },
  });
}
