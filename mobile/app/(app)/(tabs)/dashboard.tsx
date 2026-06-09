import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useNavigation } from "expo-router";
import { format, parseISO } from "date-fns";
import { supabase } from "../../../lib/supabase";
import { EXPENSE_CATEGORIES } from "../../../lib/categories";
import {
  fetchRecentExpenses,
  filterExpenses,
  getCategoryFromItem,
  getCategoryLabel,
  getOrCreateDraftReport,
  getPendingReportIds,
  submitDraftReports,
  type ExpenseCategory,
  type ExpenseEntry,
} from "../../../lib/expenses";
import { formatCurrency, getCompanyLabel, getRegionLabel, type Profile } from "../../../lib/types";
import { getErrorMessage } from "../../../lib/utils";
import { hapticLight, hapticSelection, scrollHapticHandlers } from "../../../lib/haptics";
import { useToast } from "../../../lib/toast-context";
import { useTheme } from "../../../lib/settings-context";
import { DashboardSkeleton } from "../../../components/DashboardSkeleton";
import { getFabBottom, getHomeListBottomPadding, tabBarLayout } from "../../../lib/tab-bar-layout";
import { PdxLogo } from "../../../components/PdxLogo";
import { radius, spacing, type ThemeColors } from "../../../constants/theme";

function StatusBadge({ status, colors }: { status?: string; colors: ThemeColors }) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isDraft = status === "draft";
  return (
    <View style={[styles.badge, isDraft ? styles.badgeDraft : styles.badgeSubmitted]}>
      <Text style={[styles.badgeText, isDraft ? styles.badgeTextDraft : styles.badgeTextSubmitted]}>
        {isDraft ? "Pending" : status === "submitted" ? "Submitted" : status ?? ""}
      </Text>
    </View>
  );
}

function formatExpenseDate(d: string | null | undefined): string {
  if (!d) return "";
  try {
    return format(parseISO(d), "MMM d");
  } catch {
    return d;
  }
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [draftReportId, setDraftReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">("all");
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

  const filtered = useMemo(
    () => filterExpenses(expenses, search, categoryFilter),
    [expenses, search, categoryFilter]
  );

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

  const hasActiveFilters = search.length > 0 || categoryFilter !== "all";

  function clearFilters() {
    hapticSelection();
    setSearch("");
    setCategoryFilter("all");
  }

  function selectFilter(next: ExpenseCategory | "all") {
    hapticSelection();
    setCategoryFilter(next);
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
    (navigation as { jumpTo: (name: string) => void }).jumpTo("profile");
  }

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.statsStrip}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{formatCurrency(weekTotal)}</Text>
          <Text style={styles.statLabel}>Pending $</Text>
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
        {draftCount > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.submitWeekBtn, pressed && styles.pressedBtn]}
            onPress={() => {
              hapticLight();
              submitWeek();
            }}
            disabled={submitting}
          >
            <Text style={styles.submitWeekText}>{submitting ? "…" : "Submit all"}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search receipts…"
          placeholderTextColor={colors.slate400}
          clearButtonMode="while-editing"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <Pressable
          style={[styles.filterChip, categoryFilter === "all" && styles.filterChipActive]}
          onPress={() => selectFilter("all")}
        >
          <Text style={[styles.filterText, categoryFilter === "all" && styles.filterTextActive]}>All</Text>
        </Pressable>
        {EXPENSE_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.key}
            style={[styles.filterChip, categoryFilter === cat.key && styles.filterChipActive]}
            onPress={() => selectFilter(cat.key)}
          >
            <Text style={styles.filterEmoji}>{cat.emoji}</Text>
            <Text style={[styles.filterText, categoryFilter === cat.key && styles.filterTextActive]}>
              {cat.shortLabel}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {hasActiveFilters ? (
        <View style={styles.filterMetaRow}>
          <Text style={styles.resultCount}>
            {filtered.length} of {expenses.length} receipt{expenses.length === 1 ? "" : "s"}
          </Text>
          <Pressable onPress={clearFilters} hitSlop={8}>
            <Text style={styles.clearFilters}>Clear filters</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  if (loading && !profile) {
    return (
      <View style={styles.flex}>
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
          <PdxLogo size="sm" tagline="Expense" />
        </View>
        <DashboardSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <PdxLogo size="sm" tagline="Expense" />
        <View style={styles.topBarCenter}>
          <Text style={styles.greetingCompact} numberOfLines={1}>
            Hi, {profile?.first_name}
          </Text>
          {profile ? (
            <Text style={styles.regionCompact} numberOfLines={1}>
              {getRegionLabel(profile.region)}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={openProfile} style={styles.avatar}>
          <Text style={styles.avatarText}>{profile?.first_name?.[0]?.toUpperCase() ?? "?"}</Text>
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id!}
        {...scrollHapticHandlers}
        contentContainerStyle={[styles.list, { paddingBottom: getHomeListBottomPadding(insets) }]}
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
            <Text style={styles.emptyTitle}>
              {expenses.length === 0 ? "No receipts yet" : "No matching receipts"}
            </Text>
            <Text style={styles.emptySub}>
              {expenses.length === 0
                ? "Scan a receipt to start your expense report"
                : "Try a different search or category filter"}
            </Text>
            {expenses.length === 0 ? (
              <Pressable
                style={({ pressed }) => [styles.emptyCta, pressed && styles.pressedBtn]}
                onPress={() => {
                  hapticLight();
                  router.push("/(app)/submit");
                }}
              >
                <Text style={styles.emptyCtaText}>Scan first receipt</Text>
              </Pressable>
            ) : hasActiveFilters ? (
              <Pressable style={styles.emptyCtaGhost} onPress={clearFilters}>
                <Text style={styles.clearFilters}>Clear filters</Text>
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.expenseCard, pressed && styles.expenseCardPressed]}
            onPress={() => {
              hapticLight();
              router.push(`/(app)/expense/${item.id}`);
            }}
          >
            <View style={styles.categoryStripe}>
              <Text style={styles.stripeEmoji}>
                {EXPENSE_CATEGORIES.find((c) => c.key === getCategoryFromItem(item))?.emoji ?? "📋"}
              </Text>
            </View>
            <View style={styles.expenseMain}>
              <Text style={styles.expenseDesc} numberOfLines={1}>
                {item.description || "Expense"}
              </Text>
              <Text style={styles.expenseMeta} numberOfLines={1}>
                {getCategoryLabel(item)}
                {item.company ? ` · ${getCompanyLabel(item.company)}` : ""}
                {item.expense_date ? ` · ${formatExpenseDate(item.expense_date)}` : ""}
              </Text>
              {item.related_to ? (
                <Text style={styles.relatedTo} numberOfLines={1}>
                  Related to: {item.related_to}
                </Text>
              ) : null}
            </View>
            <View style={styles.expenseRight}>
              <Text style={styles.expenseAmount}>{formatCurrency(item.row_total)}</Text>
              <StatusBadge status={item.report_status} colors={colors} />
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  topBarCenter: { flex: 1, minWidth: 0 },
  greetingCompact: { fontSize: 16, fontWeight: "700", color: colors.text },
  regionCompact: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.greenLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  avatarText: { color: colors.text, fontWeight: "800", fontSize: 14 },
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  statBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexShrink: 1,
  },
  statValue: { fontSize: 16, fontWeight: "800", color: colors.text },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statDivider: { width: 1, height: 18, backgroundColor: colors.border },
  submitWeekBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  submitWeekText: { color: colors.onPrimary, fontWeight: "700", fontSize: 13 },
  list: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },
  listHeader: { gap: spacing.sm, marginBottom: spacing.sm },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: colors.text },
  filterRow: { gap: 6, paddingVertical: 0 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterEmoji: { fontSize: 13 },
  filterText: { fontSize: 12, fontWeight: "600", color: colors.slate700 },
  filterTextActive: { color: colors.onPrimary },
  filterMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultCount: { fontSize: 12, color: colors.slate500, fontWeight: "500" },
  clearFilters: { fontSize: 12, fontWeight: "700", color: colors.primary },
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
