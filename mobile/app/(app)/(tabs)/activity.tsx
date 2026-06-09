import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { format, parseISO } from "date-fns";
import { supabase } from "../../../lib/supabase";
import {
  fetchExpenseReminders,
  getReminderStatusLabel,
  type ExpenseReminder,
} from "../../../lib/activity";
import { sendMissingExpensePush, sendTestPushNotification } from "../../../lib/push-api";
import { registerForPushNotificationsAsync } from "../../../lib/push-notifications";
import { useSettings, useTheme } from "../../../lib/settings-context";
import { formatCurrency, type Profile } from "../../../lib/types";
import { hapticLight } from "../../../lib/haptics";
import { useToast } from "../../../lib/toast-context";
import { getTabBarStackHeight } from "../../../lib/tab-bar-layout";
import { HapticSwitch } from "../../../components/HapticSwitch";
import { radius, spacing, type ThemeColors } from "../../../constants/theme";

function formatWhen(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return format(parseISO(value), "MMM d, h:mm a");
  } catch {
    return value;
  }
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { notifications, setPushEnabled, setExpenseReminders, setReportUpdates, pushToken } = useSettings();
  const { showToast } = useToast();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [reminders, setReminders] = useState<ExpenseReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pushTesting, setPushTesting] = useState(false);
  const hasLoadedRef = useRef(false);

  const pendingCount = useMemo(
    () => reminders.filter((r) => r.status === "notified" || r.status === "pending").length,
    [reminders]
  );

  const load = useCallback(async (silent = false) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/(auth)/welcome");
      return;
    }

    if (!silent && !hasLoadedRef.current) setLoading(true);

    try {
      const [{ data: p }, items] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        fetchExpenseReminders(user.id),
      ]);
      setProfile(p as Profile);
      setReminders(items);
      hasLoadedRef.current = true;
    } catch {
      setReminders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(hasLoadedRef.current);
    }, [load])
  );

  async function sendTestPush() {
    setPushTesting(true);
    try {
      await registerForPushNotificationsAsync();
      const { delivery } = await sendTestPushNotification();
      showToast(delivery?.message ?? "Test notification sent");
    } catch (error) {
      Alert.alert("Push failed", error instanceof Error ? error.message : "Could not send test notification.");
    } finally {
      setPushTesting(false);
    }
  }

  function openReminder(reminder: ExpenseReminder) {
    if (reminder.status === "submitted" || reminder.status === "dismissed") return;
    hapticLight();
    router.push({
      pathname: "/(app)/submit",
      params: {
        prefill: "1",
        merchant: reminder.merchant,
        amount: String(reminder.amount),
        expenseDate: reminder.expense_date ?? "",
        reminderId: reminder.id,
      },
    });
  }

  const isAdmin = profile?.role === "regional_manager";

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.pageTitle}>Activity</Text>
        {pendingCount > 0 ? (
          <View style={styles.countPill}>
            <Text style={styles.countText}>{pendingCount} open</Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        style={styles.flex}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: getTabBarStackHeight(insets) + spacing.lg }]}
      >
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Push notifications</Text>
              <Text style={styles.rowSub}>{pushToken ? "Enabled on this device" : "Tap to enable alerts"}</Text>
            </View>
            <HapticSwitch
              value={notifications.pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={colors.white}
            />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Expense reminders</Text>
              <Text style={styles.rowSub}>Missing receipt alerts</Text>
            </View>
            <HapticSwitch
              value={notifications.expenseReminders}
              onValueChange={setExpenseReminders}
              disabled={!notifications.pushEnabled}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={colors.white}
            />
          </View>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Report updates</Text>
              <Text style={styles.rowSub}>Approved or rejected reports</Text>
            </View>
            <HapticSwitch
              value={notifications.reportUpdates}
              onValueChange={setReportUpdates}
              disabled={!notifications.pushEnabled}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={colors.white}
            />
          </View>
          {notifications.pushEnabled ? (
            <Pressable style={styles.testBtn} onPress={sendTestPush} disabled={pushTesting}>
              <Text style={styles.testBtnText}>{pushTesting ? "Sending…" : "Send test notification"}</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.feedTitle}>Recent activity</Text>

        {loading && !reminders.length ? (
          <Text style={styles.emptySub}>Loading…</Text>
        ) : reminders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptySub}>
              Missing expense alerts and report updates will show up here.
            </Text>
          </View>
        ) : (
          reminders.map((reminder) => {
            const actionable = reminder.status === "notified" || reminder.status === "pending";
            return (
              <Pressable
                key={reminder.id}
                style={({ pressed }) => [styles.feedCard, pressed && actionable && styles.feedCardPressed]}
                onPress={() => openReminder(reminder)}
                disabled={!actionable}
              >
                <View style={styles.feedIcon}>
                  <Text style={styles.feedIconText}>{actionable ? "!" : "✓"}</Text>
                </View>
                <View style={styles.feedBody}>
                  <Text style={styles.feedMerchant} numberOfLines={1}>
                    {reminder.merchant}
                  </Text>
                  <Text style={styles.feedMeta}>
                    {formatCurrency(Number(reminder.amount))}
                    {reminder.expense_date ? ` · ${reminder.expense_date}` : ""}
                  </Text>
                  <Text style={styles.feedStatus}>{getReminderStatusLabel(reminder.status)}</Text>
                  {reminder.note ? (
                    <Text style={styles.feedNote} numberOfLines={2}>
                      {reminder.note}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.feedWhen}>{formatWhen(reminder.notified_at ?? reminder.created_at)}</Text>
              </Pressable>
            );
          })
        )}

        {isAdmin && notifications.pushEnabled ? (
          <Pressable
            style={styles.adminBtn}
            onPress={async () => {
              if (!profile) return;
              setPushTesting(true);
              try {
                await sendMissingExpensePush({
                  userId: profile.id,
                  merchant: "Sample Merchant",
                  amount: 42.5,
                  expenseDate: new Date().toISOString().slice(0, 10),
                  note: "Admin preview",
                });
                showToast("Sample alert sent");
                load(true);
              } catch (error) {
                Alert.alert("Failed", error instanceof Error ? error.message : "Could not send sample alert.");
              } finally {
                setPushTesting(false);
              }
            }}
            disabled={pushTesting}
          >
            <Text style={styles.adminBtnText}>Send sample missing expense (admin)</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: 8,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    pageTitle: { fontSize: 24, fontWeight: "800", color: colors.text, letterSpacing: -0.4 },
    countPill: {
      backgroundColor: colors.greenLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.full,
    },
    countText: { fontSize: 12, fontWeight: "700", color: colors.primaryDark },
    content: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.md },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 4 },
    rowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingVertical: spacing.sm,
    },
    rowText: { flex: 1, gap: 2 },
    rowLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
    rowSub: { fontSize: 12, color: colors.textSecondary },
    testBtn: { alignItems: "center", paddingTop: spacing.sm },
    testBtnText: { fontSize: 14, fontWeight: "700", color: colors.primary },
    feedTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginLeft: 4,
    },
    feedCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    feedCardPressed: { opacity: 0.9 },
    feedIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.greenLight,
      alignItems: "center",
      justifyContent: "center",
    },
    feedIconText: { fontSize: 16, fontWeight: "800", color: colors.primaryDark },
    feedBody: { flex: 1, minWidth: 0, gap: 2 },
    feedMerchant: { fontSize: 15, fontWeight: "700", color: colors.text },
    feedMeta: { fontSize: 13, color: colors.textSecondary },
    feedStatus: { fontSize: 12, fontWeight: "600", color: colors.primary },
    feedNote: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    feedWhen: { fontSize: 10, color: colors.textSecondary, maxWidth: 72, textAlign: "right" },
    emptyCard: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: 6,
    },
    emptyEmoji: { fontSize: 32 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 19 },
    adminBtn: { alignItems: "center", paddingVertical: spacing.sm },
    adminBtnText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  });
}
