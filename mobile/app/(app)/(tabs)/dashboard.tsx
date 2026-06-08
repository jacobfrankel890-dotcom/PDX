import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { router, useFocusEffect } from "expo-router";
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
import { useTheme } from "../../../lib/settings-context";
import { getFabBottom, getHomeListBottomPadding, tabBarLayout } from "../../../lib/tab-bar-layout";
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
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [draftReportId, setDraftReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">("all");

  const load = useCallback(async (isRefresh = false) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [{ data: p }, items, draft] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        fetchRecentExpenses(user.id),
        getOrCreateDraftReport(user.id),
      ]);

      setProfile(p as Profile);
      setExpenses(items);
      setDraftReportId(draft?.id ?? null);
    } catch (err) {
      Alert.alert("Could not load", getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
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
              Alert.alert("Submitted!", "Your expenses are now pending approval.");
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

  async function openProfile() {
    router.push("/(app)/(tabs)/profile");
  }

  const listHeader = (
    <View style={styles.listHeader}>
      <Text style={styles.listTitle}>Your receipts</Text>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search merchant, category, company…"
          placeholderTextColor={colors.slate400}
          clearButtonMode="while-editing"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <Pressable
          style={[styles.filterChip, categoryFilter === "all" && styles.filterChipActive]}
          onPress={() => setCategoryFilter("all")}
        >
          <Text style={[styles.filterText, categoryFilter === "all" && styles.filterTextActive]}>All</Text>
        </Pressable>
        {EXPENSE_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.key}
            style={[styles.filterChip, categoryFilter === cat.key && styles.filterChipActive]}
            onPress={() => setCategoryFilter(cat.key)}
          >
            <Text style={styles.filterEmoji}>{cat.emoji}</Text>
            <Text style={[styles.filterText, categoryFilter === cat.key && styles.filterTextActive]}>
              {cat.shortLabel}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {filtered.length !== expenses.length && (
        <Text style={styles.resultCount}>
          {filtered.length} of {expenses.length} receipt{expenses.length === 1 ? "" : "s"}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hi, {profile?.first_name} 👋</Text>
            <Text style={styles.region}>{profile ? getRegionLabel(profile.region) : ""}</Text>
          </View>
          <Pressable onPress={openProfile} style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.first_name?.[0]?.toUpperCase() ?? "?"}</Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>This week</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(weekTotal)}</Text>
            <Text style={styles.summarySub}>
              {draftCount} receipt{draftCount === 1 ? "" : "s"} pending
            </Text>
          </View>
          {draftCount > 0 && (
            <Pressable style={styles.submitWeekBtn} onPress={submitWeek} disabled={submitting}>
              <Text style={styles.submitWeekText}>{submitting ? "…" : "Submit all"}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id!}
        contentContainerStyle={[styles.list, { paddingBottom: getHomeListBottomPadding(insets) }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
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
                ? "Tap Add Receipt below to scan your first one"
                : "Try a different search or category filter"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.expenseCard}
            onPress={() => router.push(`/(app)/expense/${item.id}`)}
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
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>
        )}
      />

      <Pressable
        style={[
          styles.fab,
          tabBarLayout.fabShadow,
          { bottom: getFabBottom(insets), shadowColor: colors.primary },
        ]}
        onPress={() => router.push("/(app)/submit")}
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
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  greeting: { fontSize: 22, fontWeight: "700", color: colors.white },
  region: { fontSize: 14, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryAmount: { fontSize: 28, fontWeight: "800", color: colors.white, marginTop: 2 },
  summarySub: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  submitWeekBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  submitWeekText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  list: { padding: spacing.md, gap: spacing.sm },
  listHeader: { gap: spacing.sm, marginBottom: spacing.sm },
  listTitle: { fontSize: 13, fontWeight: "600", color: colors.slate500, textTransform: "uppercase", letterSpacing: 0.5 },
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
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.slate800 },
  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterEmoji: { fontSize: 14 },
  filterText: { fontSize: 13, fontWeight: "600", color: colors.slate700 },
  filterTextActive: { color: colors.white },
  resultCount: { fontSize: 12, color: colors.slate500 },
  empty: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.slate800 },
  emptySub: { fontSize: 14, color: colors.slate500, textAlign: "center", paddingHorizontal: 24 },
  expenseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: "hidden",
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryStripe: {
    width: 44,
    alignSelf: "stretch",
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stripeEmoji: { fontSize: 20 },
  expenseMain: { flex: 1, padding: spacing.md, paddingLeft: 10 },
  expenseDesc: { fontSize: 16, fontWeight: "600", color: colors.slate800 },
  expenseMeta: { fontSize: 13, color: colors.slate500, marginTop: 3 },
  relatedTo: { fontSize: 12, color: colors.primaryLight, marginTop: 2, fontStyle: "italic" },
  expenseRight: { alignItems: "flex-end", padding: spacing.md, paddingLeft: 0, gap: 4 },
  expenseAmount: { fontSize: 17, fontWeight: "700", color: colors.primary },
  chevron: { fontSize: 22, color: colors.slate400, fontWeight: "300", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeDraft: { backgroundColor: colors.greenLight },
  badgeSubmitted: { backgroundColor: "#e0e7ff" },
  badgeText: { fontSize: 11, fontWeight: "600" },
  badgeTextDraft: { color: colors.green },
  badgeTextSubmitted: { color: colors.primaryLight },
  fab: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  fabIcon: { color: colors.white, fontSize: 22, fontWeight: "300", lineHeight: 24 },
  fabText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  });
}
