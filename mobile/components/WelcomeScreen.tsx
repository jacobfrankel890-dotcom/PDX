import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import {
  AUTH_BG,
  AUTH_TAGLINE,
  AUTH_TRUST_ITEMS,
  AUTH_WHITE_90,
  authHorizontalPad,
} from "../constants/auth-chrome";
import { grid } from "../lib/grid";
import { scrollHapticHandlers } from "../lib/haptics";
import { radius } from "../constants/theme";
import { AuthScreenLayout } from "./AuthScreenLayout";
import { AuthLogoHeader } from "./AuthLogoHeader";
import { AuthOutlineButton, AuthPrimaryButton, AuthSectionLabel } from "./AuthButtons";

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
        {...scrollHapticHandlers}
      >
        <View style={styles.page}>
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
              <AuthSectionLabel>New account</AuthSectionLabel>
              <AuthPrimaryButton
                label="Create account"
                icon="+"
                onPress={() => router.push("/(auth)/signup")}
              />
              <Text style={styles.hint}>Free to join — takes about a minute.</Text>
            </View>

            <View style={styles.actionBlock}>
              <AuthSectionLabel>Returning user</AuthSectionLabel>
              <AuthOutlineButton
                label="Sign in"
                icon="→"
                onPress={() => router.push("/(auth)/login")}
              />
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
    paddingBottom: grid(5),
  },
  page: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    paddingHorizontal: authHorizontalPad - grid(0.5),
    paddingTop: grid(2),
  },
  hero: {
    gap: grid(1.5),
    marginTop: grid(1.5),
    marginBottom: grid(4.5),
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#99C221",
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: radius.full,
    gap: 4,
  },
  badgeIcon: { fontSize: 11, color: AUTH_BG },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: AUTH_BG,
    letterSpacing: 0.3,
  },
  headline: {
    fontSize: 32,
    fontWeight: "800",
    color: AUTH_WHITE_90,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  headlineCompact: {
    fontSize: 27,
    lineHeight: 32,
  },
  subheadline: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.92)",
    lineHeight: 22,
    width: "100%",
  },
  actions: {
    gap: grid(3.5),
  },
  actionBlock: {
    gap: grid(1.25),
  },
  hint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.76)",
    lineHeight: 18,
    marginTop: grid(1),
  },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: grid(5.5),
    columnGap: grid(2.5),
    rowGap: grid(1),
    paddingBottom: grid(2),
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  trustIcon: {
    fontSize: 11,
    color: "rgba(255,255,255,0.72)",
  },
  trustText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.72)",
  },
});
