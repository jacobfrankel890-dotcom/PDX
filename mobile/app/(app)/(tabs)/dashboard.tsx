import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../../../lib/supabase";
import {
  fetchRecentExpenses,
  getOrCreateDraftReport,
  getPendingReportIds,
  submitDraftReports,
  type ExpenseEntry,
} from "../../../lib/expenses";
import { formatCurrency, type Profile } from "../../../lib/types";
import { getErrorMessage } from "../../../lib/utils";
import { hapticLight } from "../../../lib/haptics";
import { ListGap } from "../../../lib/list-separator";
import { useToast } from "../../../lib/toast-context";
import { useTheme } from "../../../lib/settings-context";
import { DashboardSkeleton } from "../../../components/DashboardSkeleton";
import { ExpenseListCard } from "../../../components/ExpenseListCard";
import { getFabBottom, getHomeListBottomPadding, tabBarLayout } from "../../../lib/tab-bar-layout";
import { AppScreenHeader } from "../../../components/AppScreenHeader";
import { radius, spacing, type ThemeColors } from "../../../constants/theme";

const RECENT_LIMIT = 8;

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [draftReportId, setDraftReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const hasLoadedRef = useRef(false);

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
      const [{ data: p }, items, draft] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        fetchRecentExpenses(user.id),
        getOrCreateDraftReport(user.id),
      ]);

      setProfile(p as Profile);
      setExpenses(items);
      setDraftReportId(draft?.id ?? null);
      hasLoadedRef.current = true;
    } catch (err) {
      Alert.alert("Could not load", getErrorMessage(err));
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

  const pendingReportIds = useMemo(() => getPendingReportIds(expenses), [expenses]);

  const recentExpenses = useMemo(() => expenses.slice(0, RECENT_LIMIT), [expenses]);

  const weekTotal = useMemo(
    () => expenses.filter((e) => e.report_status === "draft").reduce((s, e) => s + (e.row_total || 0), 0),
    [expenses]
  );

  const draftCount = useMemo(
    () => expenses.filter((e) => e.report_status === "draft").length,
    [expenses]
  );

  const submittedCount = useMemo(
    () => expenses.filter((e) => e.report_status === "submitted").length,
    [expenses]
  );

  function openExpenses() {
    hapticLight();
    router.push("/(app)/(tabs)/expenses");
  }

  async function submitWeek() {
    const reportIds = pendingReportIds.length
      ? pendingReportIds
      : draftReportId
        ? [draftReportId]
        : [];

    if (!reportIds.length || draftCount === 0) {
      Alert.alert("Nothing to submit", "Add receipts first, then tap Submit all.");
      return;
    }

    Alert.alert(
      "Submit all receipts?",
      `Send ${draftCount} pending receipt${draftCount === 1 ? "" : "s"} (${formatCurrency(weekTotal)}) for approval?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            setSubmitting(true);
            try {
              await submitDraftReports(reportIds);
              showToast("Expenses submitted for approval");
              await load(true);
            } catch (err) {
              Alert.alert("Submit failed", getErrorMessage(err));
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }

  function openProfile() {
    hapticLight();
    router.push("/(app)/(tabs)/profile");
  }

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.statsStrip}>
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {formatCurrency(weekTotal)}
            </Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{draftCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{submittedCount}</Text>
            <Text style={styles.statLabel}>Submitted</Text>
          </View>
        </View>
        {draftCount > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.submitWeekBtn, pressed && styles.pressedBtn]}
            onPress={() => {
              hapticLight();
              submitWeek();
            }}
            disabled={submitting}
          >
            <Text style={styles.submitWeekText}>
              {submitting ? "Submitting…" : `Submit all · ${formatCurrency(weekTotal)}`}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {expenses.length > 0 ? (
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent receipts</Text>
          {expenses.length > RECENT_LIMIT ? (
            <Pressable onPress={openExpenses} hitSlop={8}>
              <Text style={styles.viewAll}>View all ({expenses.length})</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  if (loading && !profile) {
    return (
      <View style={styles.flex}>
        <AppScreenHeader title="Hi there" topInset={insets.top} />
        <DashboardSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <AppScreenHeader
        title={`Hi, ${profile?.first_name ?? "there"}`}
        topInset={insets.top}
        avatarInitial={profile?.first_name?.[0]?.toUpperCase() ?? "?"}
        onAvatarPress={openProfile}
      />

      <FlatList
        data={recentExpenses}
        keyExtractor={(item) => item.id!}
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: getHomeListBottomPadding(insets) }]}
        ItemSeparatorComponent={() => <ListGap />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🧾</Text>
            <Text style={styles.emptyTitle}>No receipts yet</Text>
            <Text style={styles.emptySub}>Scan a receipt to start your expense report</Text>
            <Pressable
              style={({ pressed }) => [styles.emptyCta, pressed && styles.pressedBtn]}
              onPress={() => {
                hapticLight();
                router.push("/(app)/submit");
              }}
            >
              <Text style={styles.emptyCtaText}>Scan first receipt</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <ExpenseListCard
            item={item}
            colors={colors}
            onPress={() => {
              hapticLight();
              router.push(`/(app)/expense/${item.id}`);
            }}
          />
        )}
      />

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          tabBarLayout.fabShadow,
          { bottom: getFabBottom(insets), shadowColor: colors.primary },
          pressed && styles.pressedBtn,
        ]}
        onPress={() => {
          hapticLight();
          router.push("/(app)/submit");
        }}
      >
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabText}>Add Receipt</Text>
      </Pressable>
    </View>
  );
}


function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  statsStrip: {
    flexDirection: "column",
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  statValue: { fontSize: 17, fontWeight: "800", color: colors.text, textAlign: "center" },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
  statDivider: { width: 1, alignSelf: "stretch", backgroundColor: colors.border, marginVertical: 2 },
  submitWeekBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.full,
    alignItems: "center",
  },
  submitWeekText: { color: colors.onPrimary, fontWeight: "700", fontSize: 14, textAlign: "center" },
  list: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  listHeader: { gap: spacing.sm, marginBottom: spacing.sm },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  viewAll: { fontSize: 13, fontWeight: "700", color: colors.primary },
  empty: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingHorizontal: 24, lineHeight: 20 },
  emptyCta: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  emptyCtaText: { color: colors.onPrimary, fontWeight: "700", fontSize: 14 },
  emptyCtaGhost: { marginTop: spacing.sm, paddingVertical: 8 },
  expenseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  expenseCardPressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  pressedBtn: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  categoryStripe: {
    width: 40,
    alignSelf: "stretch",
    backgroundColor: colors.greenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stripeEmoji: { fontSize: 18 },
  expenseMain: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, minWidth: 0 },
  expenseDesc: { fontSize: 15, fontWeight: "600", color: colors.text },
  expenseMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  relatedTo: { fontSize: 11, color: colors.primaryDark, marginTop: 2, fontStyle: "italic" },
  expenseRight: { alignItems: "flex-end", paddingVertical: 10, paddingRight: 4, gap: 4, flexShrink: 0 },
  expenseAmount: { fontSize: 16, fontWeight: "800", color: colors.primary },
  chevron: { fontSize: 20, color: colors.slate400, fontWeight: "300", paddingRight: 10 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full },
  badgeDraft: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  badgeSubmitted: { backgroundColor: colors.greenLight },
  badgeText: { fontSize: 10, fontWeight: "700" },
  badgeTextDraft: { color: colors.primaryDark },
  badgeTextSubmitted: { color: colors.primaryDark },
  fab: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: radius.lg,
  },
  fabIcon: { color: colors.onPrimary, fontSize: 20, fontWeight: "400", lineHeight: 22 },
  fabText: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
  });
}
