import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import {
  AUTH_BG,
  AUTH_BORDER,
  AUTH_GRAY_60,
  AUTH_TAGLINE,
  AUTH_TRUST_ITEMS,
  AUTH_WHITE_90,
} from "../constants/auth-chrome";
import { grid } from "../lib/grid";
import { radius } from "../constants/theme";
import { AuthScreenLayout } from "./AuthScreenLayout";
import { AuthLogoHeader } from "./AuthLogoHeader";

export function WelcomeScreen() {
  const { height } = useWindowDimensions();
  const compact = height < 740;

  return (
    <AuthScreenLayout>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <AuthLogoHeader compact={compact} />

        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>⚡</Text>
            <Text style={styles.badgeText}>For PDX teams</Text>
          </View>

          <Text style={[styles.headline, compact && styles.headlineCompact]}>
            Your receipts.{"\n"}Submitted.
          </Text>
          <Text style={styles.subheadline}>{AUTH_TAGLINE}</Text>
        </View>

        <View style={styles.actions}>
          <View style={styles.actionBlock}>
            <Text style={styles.sectionLabel}>New account</Text>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
              onPress={() => router.push("/(auth)/signup")}
            >
              <Text style={styles.primaryBtnText}>Create account</Text>
              <Text style={styles.primaryBtnIcon}>+</Text>
            </Pressable>
            <Text style={styles.hint}>First time here? Free to join — takes about a minute.</Text>
          </View>

          <View style={styles.actionBlock}>
            <Text style={styles.sectionLabel}>Returning user</Text>
            <Pressable
              style={({ pressed }) => [styles.outlineBtn, pressed && styles.btnPressed]}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.outlineBtnIcon}>→</Text>
              <Text style={styles.outlineBtnText}>Sign in</Text>
            </Pressable>
          </View>
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
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: grid(3),
  },
  hero: {
    gap: grid(2),
    marginBottom: grid(3),
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
  },
  badgeIcon: { fontSize: 11, color: AUTH_BG },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: AUTH_BG,
    letterSpacing: 0.4,
  },
  headline: {
    fontSize: 34,
    fontWeight: "800",
    color: AUTH_WHITE_90,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  headlineCompact: {
    fontSize: 28,
    lineHeight: 34,
  },
  subheadline: {
    fontSize: 15,
    fontWeight: "500",
    color: AUTH_GRAY_60,
    lineHeight: 22,
    maxWidth: 340,
  },
  actions: {
    gap: grid(3),
  },
  actionBlock: {
    gap: grid(1),
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: AUTH_GRAY_60,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    borderRadius: 16,
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
    color: AUTH_GRAY_60,
    lineHeight: 18,
  },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: AUTH_BORDER,
    backgroundColor: "rgba(255,255,255,0.08)",
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
    marginTop: "auto",
    paddingTop: grid(4),
    columnGap: grid(2),
    rowGap: grid(1),
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trustIcon: {
    fontSize: 12,
    color: AUTH_GRAY_60,
  },
  trustText: {
    fontSize: 12,
    fontWeight: "500",
    color: AUTH_GRAY_60,
  },
});
