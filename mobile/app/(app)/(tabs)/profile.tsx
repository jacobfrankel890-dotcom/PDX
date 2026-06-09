import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { copyTextToClipboard } from "../../../lib/safe-clipboard";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { useSettings, useTheme, type ThemeMode } from "../../../lib/settings-context";
import { useAppUpdates } from "../../../lib/use-app-updates";
import {
  disableBiometricLogin,
  enableBiometricLoginWithPrompt,
  getBiometricLabel,
  isBiometricHardwareAvailable,
  isBiometricNativeAvailable,
  isBiometricPreferenceEnabled,
  signOutPreservingBiometric,
} from "../../../lib/biometric-auth";
import { hapticSelection, hapticLight } from "../../../lib/haptics";
import { useToast } from "../../../lib/toast-context";
import { sendMissingExpensePush, sendTestPushNotification } from "../../../lib/push-api";
import { registerForPushNotificationsAsync } from "../../../lib/push-notifications";
import { HapticSwitch } from "../../../components/HapticSwitch";
import { ProfileCompanyPicker, companyToRegion } from "../../../components/ProfileCompanyPicker";
import { RolePicker } from "../../../components/RolePicker";
import {
  getCompanyShortLabel,
  getRegionLabel,
  getRoleLabel,
  type CompanyValue,
  type Profile,
  type UserRole,
} from "../../../lib/types";
import { radius, spacing, type ThemeColors } from "../../../constants/theme";
import { getTabBarStackHeight } from "../../../lib/tab-bar-layout";
import { AppScreenHeader } from "../../../components/AppScreenHeader";

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
      onPress={() => {
        hapticSelection();
        onSelect(mode);
      }}
    >
      <Text style={[styles.themeChipText, selected && styles.themeChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors, themeMode, setThemeMode, isDark } = useTheme();
  const { notifications, setPushEnabled, setExpenseReminders, setReportUpdates, pushToken } = useSettings();
  const { info: updateInfo, checkForUpdate } = useAppUpdates(false);
  const { showToast } = useToast();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const buildNumber =
    Platform.OS === "ios"
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode?.toString();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometrics");
  const [refreshing, setRefreshing] = useState(false);
  const [savingWork, setSavingWork] = useState(false);
  const [pushTesting, setPushTesting] = useState(false);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/(auth)/welcome");
      return;
    }

    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) throw error;
      setProfile(data as Profile);
      setBiometricEnabled(await isBiometricPreferenceEnabled());
      setBiometricAvailable(isBiometricNativeAvailable() && (await isBiometricHardwareAvailable()));
      setBiometricLabel(await getBiometricLabel());
      hasLoadedRef.current = true;
    } catch {
      if (!hasLoadedRef.current) {
        Alert.alert("Could not load profile", "Pull down to try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      isBiometricPreferenceEnabled().then(setBiometricEnabled);
    }, [])
  );

  async function copyEmail() {
    if (!profile?.email) return;
    const copied = await copyTextToClipboard(profile.email);
    hapticLight();
    showToast(copied ? "Email copied" : "Copy unavailable in this build");
  }

  async function contactSupport() {
    hapticLight();
    const url = "mailto:support@partsdistributionxpress.com?subject=PDX%20Expense%20Support";
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return;
    }
    const copied = await copyTextToClipboard("support@partsdistributionxpress.com");
    showToast(copied ? "Support email copied" : "Email support@partsdistributionxpress.com");
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function saveWorkDefaults(updates: { role?: UserRole; company?: CompanyValue }) {
    if (!profile || savingWork) return;
    setSavingWork(true);
    try {
      const payload: Partial<Profile> = { ...updates };
      if (updates.company) {
        payload.region = companyToRegion(updates.company);
      }
      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", profile.id)
        .select("*")
        .single();
      if (error) throw error;
      setProfile(data as Profile);
      hapticLight();
      showToast("Work defaults updated");
    } catch (error) {
      Alert.alert("Could not save", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSavingWork(false);
    }
  }

  async function sendTestPush() {
    if (!notifications.pushEnabled) {
      Alert.alert("Enable push first", "Turn on push notifications above, then try again.");
      return;
    }
    setPushTesting(true);
    try {
      await registerForPushNotificationsAsync();
      const { sent, delivery } = await sendTestPushNotification();
      if (sent <= 0) {
        showToast("No devices registered");
        return;
      }
      if (delivery?.status === "ok") {
        showToast("Test notification sent");
        return;
      }
      showToast(delivery?.message ?? "Test notification sent");
    } catch (error) {
      Alert.alert("Push failed", error instanceof Error ? error.message : "Could not send test notification.");
    } finally {
      setPushTesting(false);
    }
  }

  async function sendSampleMissingExpensePush() {
    if (!profile) return;
    if (!notifications.pushEnabled) {
      Alert.alert("Enable push first", "Turn on push notifications above, then try again.");
      return;
    }
    setPushTesting(true);
    try {
      await sendMissingExpensePush({
        userId: profile.id,
        merchant: "Sample Merchant",
        amount: 42.5,
        expenseDate: new Date().toISOString().slice(0, 10),
        note: "Sample missing expense — tap to open the submit form.",
      });
      showToast("Sample missing-expense push sent");
    } catch (error) {
      Alert.alert("Push failed", error instanceof Error ? error.message : "Could not send notification.");
    } finally {
      setPushTesting(false);
    }
  }

  async function toggleBiometric(enabled: boolean) {
    if (enabled) {
      try {
        if (!(await isBiometricHardwareAvailable())) {
          Alert.alert("Not available", "Set up Face ID, Touch ID, or fingerprint on this device first.");
          return;
        }
        const { data } = await supabase.auth.getSession();
        const refreshToken = data.session?.refresh_token;
        if (!refreshToken) {
          Alert.alert("Sign in again", "Sign out and sign in with password to enable biometric sign-in.");
          return;
        }
        const saved = await enableBiometricLoginWithPrompt(refreshToken);
        setBiometricEnabled(saved && (await isBiometricPreferenceEnabled()));
        if (saved) showToast(`${biometricLabel} sign-in enabled`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Biometric sign-in could not be enabled.";
        Alert.alert("Couldn't enable biometrics", message);
        setBiometricEnabled(false);
      }
    } else {
      await disableBiometricLogin();
      setBiometricEnabled(false);
    }
  }

  async function signOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOutPreservingBiometric();
          router.replace("/(auth)/welcome");
        },
      },
    ]);
  }

  if (loading && !profile) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, gap: spacing.md }]}>
        <Text style={styles.pageTitle}>Profile</Text>
        <Text style={styles.loadError}>Could not load your profile.</Text>
        <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const roleLabel = getRoleLabel(profile.role);
  const isAdmin = profile.role === "regional_manager";

  return (
    <View style={styles.flex}>
      <AppScreenHeader title="Profile" topInset={insets.top} subtitle="Settings & account" />
      <ScrollView
        style={styles.flex}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: getTabBarStackHeight(insets) + spacing.lg,
          },
        ]}
      >
      <View style={styles.userCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{profile.first_name?.[0]?.toUpperCase() ?? "?"}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {profile.first_name} {profile.last_name}
          </Text>
          <Pressable onPress={copyEmail} hitSlop={8} style={styles.emailBlock}>
            <Text style={styles.userEmail} numberOfLines={1}>
              {profile.email}
            </Text>
            <Text style={styles.copyHint}>Tap to copy email</Text>
          </Pressable>
          <View style={styles.userMeta}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Company</Text>
              <Text style={styles.metaPill}>{getCompanyShortLabel(profile.company)}</Text>
            </View>
            {roleLabel ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Role</Text>
                <Text style={styles.metaPill}>{roleLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <Section title="Work defaults" colors={colors} isDark={isDark}>
        <ProfileCompanyPicker
          value={profile.company}
          onChange={(company) => saveWorkDefaults({ company })}
        />
        <RolePicker value={profile.role} onChange={(role) => saveWorkDefaults({ role })} />
        <View style={styles.workHintRow}>
          <Text style={styles.workHint}>
            Used as the default when submitting new receipts. Region: {getRegionLabel(profile.region)}.
          </Text>
        </View>
      </Section>

      <Section title="Appearance" colors={colors} isDark={isDark}>
        <View style={styles.themeRow}>
          <ThemeOption mode="light" label="Light" selected={themeMode === "light"} onSelect={setThemeMode} colors={colors} isDark={isDark} />
          <ThemeOption mode="dark" label="Dark" selected={themeMode === "dark"} onSelect={setThemeMode} colors={colors} isDark={isDark} />
          <ThemeOption mode="system" label="System" selected={themeMode === "system"} onSelect={setThemeMode} colors={colors} isDark={isDark} />
        </View>
      </Section>

      {biometricAvailable ? (
        <Section title="Security" colors={colors} isDark={isDark}>
          <SettingRow
            label={`${biometricLabel} sign-in`}
            subtitle={
              biometricEnabled
                ? `${biometricLabel} is enabled on this device`
                : `Sign in quickly with ${biometricLabel}`
            }
            colors={colors}
            isDark={isDark}
            last
          >
            <HapticSwitch
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={colors.white}
            />
          </SettingRow>
        </Section>
      ) : null}

      <Section title="Notifications" colors={colors} isDark={isDark}>
        <SettingRow
          label="Push notifications"
          subtitle={pushToken ? "Enabled on this device" : "Get alerts for expense activity"}
          colors={colors}
          isDark={isDark}
        >
          <HapticSwitch
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
          <HapticSwitch
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
            <HapticSwitch
              value={notifications.reportUpdates}
              onValueChange={setReportUpdates}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={colors.white}
            />
          </SettingRow>
        ) : null}
      </Section>

      {notifications.pushEnabled ? (
        <Section title="Push testing" colors={colors} isDark={isDark}>
          <Pressable style={styles.linkRow} onPress={sendTestPush} disabled={pushTesting}>
            <Text style={styles.linkRowLabel}>{pushTesting ? "Sending…" : "Send test notification"}</Text>
            <Text style={styles.linkRowChevron}>›</Text>
          </Pressable>
          {isAdmin ? (
            <Pressable
              style={[styles.linkRow, styles.linkRowLast]}
              onPress={sendSampleMissingExpensePush}
              disabled={pushTesting}
            >
              <View style={styles.rowText}>
                <Text style={styles.linkRowLabel}>Send sample missing expense</Text>
                <Text style={styles.rowSub}>Admin preview — opens submit form with prefill</Text>
              </View>
              <Text style={styles.linkRowChevron}>›</Text>
            </Pressable>
          ) : null}
        </Section>
      ) : null}

      <Section title="App updates" colors={colors} isDark={isDark}>
        <SettingRow
          label="Update channel"
          subtitle={updateInfo.channel ?? "Not configured — need TestFlight build #3+"}
          colors={colors}
          isDark={isDark}
        />
        <SettingRow
          label="Status"
          subtitle={updateInfo.message || `Runtime ${updateInfo.runtimeVersion ?? "?"}`}
          colors={colors}
          isDark={isDark}
          last={!updateInfo.updateId}
        />
        {updateInfo.updateId ? (
          <SettingRow
            label="Installed update"
            subtitle={updateInfo.updateId.slice(0, 8) + "…"}
            colors={colors}
            isDark={isDark}
            last
          />
        ) : null}
        <Pressable
          style={styles.updateBtn}
          onPress={() => checkForUpdate(true)}
          disabled={updateInfo.status === "checking" || updateInfo.status === "downloading"}
        >
          <Text style={styles.updateBtnText}>
            {updateInfo.status === "checking" || updateInfo.status === "downloading"
              ? updateInfo.message
              : "Check for updates"}
          </Text>
        </Pressable>
      </Section>

      <Section title="Support" colors={colors} isDark={isDark}>
        <Pressable style={styles.linkRow} onPress={contactSupport}>
          <Text style={styles.linkRowLabel}>Contact support</Text>
          <Text style={styles.linkRowChevron}>›</Text>
        </Pressable>
        <View style={[styles.rowStatic, styles.rowBorder]}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>App version</Text>
            <Text style={styles.rowSub}>
              v{appVersion}
              {buildNumber ? ` (${buildNumber})` : ""}
            </Text>
          </View>
        </View>
      </Section>

      <Section title="Account" colors={colors} isDark={isDark}>
        <Pressable style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </Section>

      <Text style={styles.footer}>PDX Expense · Parts Distribution Xpress</Text>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
    content: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.lg },
    pageTitle: { fontSize: 28, fontWeight: "800", color: colors.text, textAlign: "center" },
    userCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDark ? 0.2 : 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    avatarLarge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.greenLight,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.primary,
      flexShrink: 0,
    },
    avatarLargeText: { color: colors.text, fontSize: 26, fontWeight: "800" },
    userInfo: { flex: 1, minWidth: 0, gap: 4 },
    userName: { fontSize: 20, fontWeight: "700", color: colors.text },
    emailBlock: { gap: 2 },
    userEmail: { fontSize: 14, color: colors.textSecondary },
    copyHint: { fontSize: 11, color: colors.primary, fontWeight: "600" },
    userMeta: {
      gap: 8,
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    metaLabel: {
      width: 64,
      fontSize: 11,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    metaPill: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      color: colors.primaryDark,
      backgroundColor: colors.greenLight,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.full,
      overflow: "hidden",
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
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDark ? 0.2 : 0.06,
      shadowRadius: 8,
      elevation: 2,
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
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    linkRowLast: {
      borderBottomWidth: 0,
    },
    linkRowLabel: { fontSize: 16, fontWeight: "600", color: colors.primary },
    linkRowChevron: { fontSize: 20, color: colors.slate400, fontWeight: "300" },
    rowStatic: { padding: spacing.md },
    workHintRow: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    workHint: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },
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
    themeChipTextActive: { color: colors.onPrimary },
    signOutBtn: { padding: spacing.md, alignItems: "center" },
    signOutText: { color: colors.error, fontSize: 16, fontWeight: "700" },
    updateBtn: {
      padding: spacing.md,
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    updateBtnText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
    footer: { textAlign: "center", fontSize: 12, color: colors.slate400, marginTop: spacing.sm },
    loadError: { fontSize: 15, color: colors.textSecondary, textAlign: "center" },
    retryBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
    },
    retryText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  });
}
