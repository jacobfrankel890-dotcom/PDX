import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AUTH_BG,
  AUTH_BORDER,
  AUTH_GRAY_45,
  AUTH_GRAY_60,
  AUTH_TAGLINE,
  AUTH_TRUST_ITEMS,
  AUTH_WHITE_90,
  authHorizontalPad,
} from "../constants/auth-chrome";
import { grid } from "../lib/grid";
import { radius } from "../constants/theme";
import { AuthScreenBackdrop } from "./AuthScreenBackdrop";
import { AuthLogoHeader } from "./AuthLogoHeader";

export function WelcomeScreen() {
  const { height } = useWindowDimensions();
  const compact = height < 740;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.background} pointerEvents="none">
        <AuthScreenBackdrop />
      </View>

      <SafeAreaView style={styles.foreground} edges={["top", "bottom"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <AuthLogoHeader compact={compact} />

          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>⚡</Text>
            <Text style={styles.badgeText}>For PDX teams</Text>
          </View>

          <Text style={[styles.headline, compact && styles.headlineCompact]}>
            Your receipts.{"\n"}Submitted.
          </Text>
          <Text style={styles.subheadline}>{AUTH_TAGLINE}</Text>

          <View style={styles.actions}>
            <Text style={styles.sectionLabel}>New account</Text>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
              onPress={() => router.push("/(auth)/signup")}
            >
              <Text style={styles.primaryBtnText}>Create account</Text>
              <Text style={styles.primaryBtnIcon}>+</Text>
            </Pressable>
            <Text style={styles.hint}>First time here? Free to join — takes about a minute.</Text>

            <Text style={[styles.sectionLabel, styles.sectionLabelGap]}>Returning user</Text>
            <Pressable
              style={({ pressed }) => [styles.outlineBtn, pressed && styles.btnPressed]}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.outlineBtnIcon}>→</Text>
              <Text style={styles.outlineBtnText}>Sign in</Text>
            </Pressable>
          </View>

          <View style={styles.trustRow}>
            {AUTH_TRUST_ITEMS.map((item) => (
              <View key={item.label} style={styles.trustItem}>
                <Text style={styles.trustIcon}>{item.icon}</Text>
                <Text style={styles.trustText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  foreground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: authHorizontalPad,
    paddingBottom: grid(4),
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
    marginBottom: grid(1.5),
  },
  badgeIcon: { fontSize: 11, color: AUTH_BG },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: AUTH_BG,
    letterSpacing: 0.4,
  },
  headline: {
    fontSize: 36,
    fontWeight: "800",
    color: AUTH_WHITE_90,
    lineHeight: 42,
    letterSpacing: -1,
    marginBottom: grid(1.5),
  },
  headlineCompact: {
    fontSize: 30,
    lineHeight: 36,
  },
  subheadline: {
    fontSize: 16,
    fontWeight: "500",
    color: AUTH_GRAY_60,
    lineHeight: 24,
    marginBottom: grid(1.5),
  },
  actions: {
    gap: grid(1),
    marginTop: grid(0.5),
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: AUTH_GRAY_45,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: grid(0.5),
  },
  sectionLabelGap: {
    marginTop: grid(2),
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#99C221",
    gap: 10,
    paddingHorizontal: grid(3),
  },
  primaryBtnText: {
    color: AUTH_BG,
    fontSize: 17,
    fontWeight: "800",
  },
  primaryBtnIcon: {
    color: AUTH_BG,
    fontSize: 20,
    fontWeight: "800",
  },
  hint: {
    fontSize: 13,
    color: AUTH_GRAY_45,
    lineHeight: 18,
    marginTop: 4,
  },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: AUTH_BORDER,
    backgroundColor: "rgba(255,255,255,0.06)",
    gap: 10,
    paddingHorizontal: grid(3),
  },
  outlineBtnIcon: {
    color: AUTH_WHITE_90,
    fontSize: 18,
    fontWeight: "700",
  },
  outlineBtnText: {
    color: AUTH_WHITE_90,
    fontSize: 17,
    fontWeight: "700",
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: grid(3),
    columnGap: grid(2.5),
    rowGap: grid(1.5),
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
});
