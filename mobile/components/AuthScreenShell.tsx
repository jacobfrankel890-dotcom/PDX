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
import {
  AUTH_BG,
  AUTH_GRAY_45,
  AUTH_GRAY_60,
  AUTH_TRUST_ITEMS,
  AUTH_WHITE_90,
  authHorizontalPad,
} from "../constants/auth-chrome";
import { grid } from "../lib/grid";
import { radius } from "../constants/theme";
import { AuthScreenLayout } from "./AuthScreenLayout";
import { AuthLogoHeader } from "./AuthLogoHeader";

type Props = {
  title: string;
  subtitle?: string;
  sectionLabel?: string;
  badge?: string;
  children: ReactNode;
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scrollKey?: string | number;
  showTrust?: boolean;
  compactHero?: boolean;
};

export function AuthScreenShell({
  title,
  subtitle,
  sectionLabel,
  badge,
  children,
  footer,
  contentStyle,
  scrollKey,
  showTrust = true,
  compactHero,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollKey === undefined) return;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [scrollKey]);

  return (
    <AuthScreenLayout>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <AuthLogoHeader compact={compactHero} />

          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>⚡</Text>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}

          {sectionLabel ? <Text style={styles.sectionLabel}>{sectionLabel}</Text> : null}

          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <View style={styles.form}>{children}</View>

          {showTrust ? (
            <View style={styles.trustRow}>
              {AUTH_TRUST_ITEMS.map((item) => (
                <View key={item.label} style={styles.trustItem}>
                  <Text style={styles.trustIcon}>{item.icon}</Text>
                  <Text style={styles.trustText}>{item.label}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: authHorizontalPad,
    paddingBottom: grid(3),
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#99C221",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    gap: 4,
    marginBottom: grid(2),
  },
  badgeIcon: { fontSize: 11, color: AUTH_BG },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: AUTH_BG,
    letterSpacing: 0.4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: AUTH_GRAY_45,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: grid(1),
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: AUTH_WHITE_90,
    letterSpacing: -0.8,
    lineHeight: 40,
    marginBottom: grid(1),
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: AUTH_GRAY_60,
    lineHeight: 24,
    marginBottom: grid(2),
  },
  form: {
    gap: grid(2),
  },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: grid(2),
    columnGap: grid(2),
    rowGap: grid(1),
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trustIcon: {
    fontSize: 13,
    color: AUTH_GRAY_45,
  },
  trustText: {
    fontSize: 13,
    fontWeight: "500",
    color: AUTH_GRAY_45,
  },
  footer: {
    alignItems: "center",
    paddingTop: grid(2),
  },
});
