import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { useSettings, useTheme, type ThemeMode } from "../../../lib/settings-context";
import {
  getCompanyLabel,
  getRegionLabel,
  ROLES,
  type Profile,
} from "../../../lib/types";
import { radius, spacing, type ThemeColors } from "../../../constants/theme";

function Section({
  title,
  children,
  colors,
  isDark,
}: {
  title: string;
  children: React.ReactNode;
  colors: ThemeColors;
  isDark: boolean;
}) {
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingRow({
  label,
  subtitle,
  children,
  colors,
  isDark,
  last,
}: {
  label: string;
  subtitle?: string;
  children?: React.ReactNode;
  colors: ThemeColors;
  isDark: boolean;
  last?: boolean;
}) {
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function ThemeOption({
  mode,
  label,
  selected,
  onSelect,
  colors,
  isDark,
}: {
  mode: ThemeMode;
  label: string;
  selected: boolean;
  onSelect: (mode: ThemeMode) => void;
  colors: ThemeColors;
  isDark: boolean;
}) {
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  return (
    <Pressable
      style={[styles.themeChip, selected && styles.themeChipActive]}
      onPress={() => onSelect(mode)}
    >
      <Text style={[styles.themeChipText, selected && styles.themeChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors, themeMode, setThemeMode, isDark } = useTheme();
  const { notifications, setPushEnabled, setExpenseReminders, setReportUpdates, pushToken } = useSettings();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(data as Profile);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  async function signOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  const roleLabel = ROLES.find((r) => r.value === profile?.role)?.label ?? profile?.role;

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }]}
    >
      <Text style={styles.pageTitle}>Profile</Text>

      <View style={styles.userCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{profile?.first_name?.[0]?.toUpperCase() ?? "?"}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {profile?.first_name} {profile?.last_name}
          </Text>
          <Text style={styles.userEmail}>{profile?.email}</Text>
          <View style={styles.userMeta}>
            <Text style={styles.metaPill}>{profile ? getRegionLabel(profile.region) : ""}</Text>
            <Text style={styles.metaPill}>{profile ? getCompanyLabel(profile.company) : ""}</Text>
            {roleLabel ? <Text style={styles.metaPill}>{roleLabel}</Text> : null}
          </View>
        </View>
      </View>

      <Section title="Appearance" colors={colors} isDark={isDark}>
        <View style={styles.themeRow}>
          <ThemeOption mode="light" label="Light" selected={themeMode === "light"} onSelect={setThemeMode} colors={colors} isDark={isDark} />
          <ThemeOption mode="dark" label="Dark" selected={themeMode === "dark"} onSelect={setThemeMode} colors={colors} isDark={isDark} />
          <ThemeOption mode="system" label="System" selected={themeMode === "system"} onSelect={setThemeMode} colors={colors} isDark={isDark} />
        </View>
      </Section>

      <Section title="Notifications" colors={colors} isDark={isDark}>
        <SettingRow
          label="Push notifications"
          subtitle={pushToken ? "Enabled on this device" : "Get alerts for expense activity"}
          colors={colors}
          isDark={isDark}
        >
          <Switch
            value={notifications.pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={colors.white}
          />
        </SettingRow>
        <SettingRow
          label="Expense reminders"
          subtitle="Weekly nudge to submit pending receipts"
          colors={colors}
          isDark={isDark}
          last={!notifications.pushEnabled}
        >
          <Switch
            value={notifications.expenseReminders}
            onValueChange={setExpenseReminders}
            disabled={!notifications.pushEnabled}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={colors.white}
          />
        </SettingRow>
        {notifications.pushEnabled ? (
          <SettingRow
            label="Report status updates"
            subtitle="When your expense report is approved or rejected"
            colors={colors}
            isDark={isDark}
            last
          >
            <Switch
              value={notifications.reportUpdates}
              onValueChange={setReportUpdates}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={colors.white}
            />
          </SettingRow>
        ) : null}
      </Section>

      <Section title="Account" colors={colors} isDark={isDark}>
        <Pressable style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </Section>

      <Text style={styles.footer}>PDX Expense · v1.0.0</Text>
    </ScrollView>
  );
}

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
    content: { paddingHorizontal: spacing.md, gap: spacing.lg },
    pageTitle: { fontSize: 28, fontWeight: "800", color: colors.text, marginBottom: spacing.xs },
    userCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarLarge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarLargeText: { color: colors.white, fontSize: 26, fontWeight: "700" },
    userInfo: { flex: 1, gap: 4 },
    userName: { fontSize: 20, fontWeight: "700", color: colors.text },
    userEmail: { fontSize: 14, color: colors.textSecondary },
    userMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
    metaPill: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary,
      backgroundColor: isDark ? "#334155" : "#e8eef5",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.full,
    },
    section: { gap: spacing.sm },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginLeft: 4,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: spacing.md,
      gap: spacing.md,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    rowText: { flex: 1 },
    rowLabel: { fontSize: 16, fontWeight: "600", color: colors.text },
    rowSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    themeRow: { flexDirection: "row", padding: spacing.sm, gap: spacing.sm },
    themeChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radius.sm,
      alignItems: "center",
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    themeChipText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
    themeChipTextActive: { color: colors.white },
    signOutBtn: { padding: spacing.md, alignItems: "center" },
    signOutText: { color: colors.error, fontSize: 16, fontWeight: "700" },
    footer: { textAlign: "center", fontSize: 12, color: colors.slate400, marginTop: spacing.sm },
  });
}
