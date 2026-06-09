import { useCallback, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import { EXPENSE_CATEGORIES } from "../../../lib/categories";
import {
  applyExpenseFilters,
  countActiveExpenseFilters,
  EXPENSE_SORT_OPTIONS,
  EXPENSE_STATUS_FILTERS,
  type ExpenseSortKey,
  type ExpenseStatusFilter,
} from "../../../lib/expense-filters";
import { groupExpensesByMonth, sumExpenseTotals } from "../../../lib/expense-sections";
import {
  fetchRecentExpenses,
  type ExpenseCategory,
  type ExpenseEntry,
} from "../../../lib/expenses";
import { hapticLight, hapticSelection } from "../../../lib/haptics";
import { useTheme } from "../../../lib/settings-context";
import { formatCurrency } from "../../../lib/types";
import { getTabBarStackHeight } from "../../../lib/tab-bar-layout";
import { ExpenseCompactRow } from "../../../components/ExpenseCompactRow";
import { radius, spacing, type ThemeColors } from "../../../constants/theme";

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ExpenseStatusFilter>("all");
  const [sort, setSort] = useState<ExpenseSortKey>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
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
      const items = await fetchRecentExpenses(user.id);
      setExpenses(items);
      hasLoadedRef.current = true;
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

  const filtered = useMemo(
    () =>
      applyExpenseFilters(expenses, {
        query: search,
        category: categoryFilter,
        status: statusFilter,
        sort,
      }),
    [expenses, search, categoryFilter, statusFilter, sort]
  );

  const sections = useMemo(() => groupExpensesByMonth(filtered), [filtered]);
  const totals = useMemo(() => sumExpenseTotals(filtered), [filtered]);

  const activeFilterCount = countActiveExpenseFilters({
    query: search,
    category: categoryFilter,
    status: statusFilter,
    sort,
  });

  function clearFilters() {
    hapticSelection();
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setSort("newest");
  }

  const listHeader = (
    <View style={styles.headerBlock}>
      <Text style={styles.subtitle}>Browse and filter all receipts</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTotal}>{formatCurrency(totals.total)}</Text>
        <Text style={styles.summaryLabel}>
          {filtered.length} receipt{filtered.length === 1 ? "" : "s"} shown
        </Text>
        <View style={styles.summaryBreakdown}>
          <View style={styles.breakdownItem}>
            <View style={[styles.legendDot, styles.legendPending]} />
            <Text style={styles.breakdownText}>
              {totals.pendingCount} pending · {formatCurrency(totals.pending)}
            </Text>
          </View>
          <View style={styles.breakdownItem}>
            <View style={[styles.legendDot, styles.legendSubmitted]} />
            <Text style={styles.breakdownText}>
              {totals.submittedCount} submitted · {formatCurrency(totals.submitted)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search merchant, category, date…"
          placeholderTextColor={colors.slate400}
          clearButtonMode="while-editing"
        />
      </View>

      <Pressable
        style={styles.filterToggle}
        onPress={() => {
          hapticSelection();
          setFiltersOpen((v) => !v);
        }}
      >
        <Ionicons name="options-outline" size={18} color={colors.text} />
        <Text style={styles.filterToggleText}>Filters & sort</Text>
        {activeFilterCount > 0 ? (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
          </View>
        ) : null}
        <Ionicons
          name={filtersOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textSecondary}
          style={styles.filterChevron}
        />
      </Pressable>

      {filtersOpen ? (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {EXPENSE_STATUS_FILTERS.map((option) => (
              <Pressable
                key={option.key}
                style={[styles.chip, statusFilter === option.key && styles.chipActive]}
                onPress={() => {
                  hapticSelection();
                  setStatusFilter(option.key);
                }}
              >
                <Text style={[styles.chipText, statusFilter === option.key && styles.chipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable
              style={[styles.chip, categoryFilter === "all" && styles.chipActive]}
              onPress={() => {
                hapticSelection();
                setCategoryFilter("all");
              }}
            >
              <Text style={[styles.chipText, categoryFilter === "all" && styles.chipTextActive]}>All</Text>
            </Pressable>
            {EXPENSE_CATEGORIES.map((cat) => (
              <Pressable
                key={cat.key}
                style={[styles.chip, categoryFilter === cat.key && styles.chipActive]}
                onPress={() => {
                  hapticSelection();
                  setCategoryFilter(cat.key);
                }}
              >
                <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                <Text style={[styles.chipText, categoryFilter === cat.key && styles.chipTextActive]}>
                  {cat.shortLabel}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Sort</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {EXPENSE_SORT_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                style={[styles.chip, sort === option.key && styles.chipActive]}
                onPress={() => {
                  hapticSelection();
                  setSort(option.key);
                }}
              >
                <Text style={[styles.chipText, sort === option.key && styles.chipTextActive]}>{option.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {activeFilterCount > 0 ? (
            <Pressable onPress={clearFilters} style={styles.clearBtn}>
              <Text style={styles.clearFilters}>Clear all filters</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.pageTitle}>Expenses</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id!}
        stickySectionHeadersEnabled
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: getTabBarStackHeight(insets) + spacing.lg }]}
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
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🧾</Text>
              <Text style={styles.emptyTitle}>
                {expenses.length === 0 ? "No receipts yet" : "No matching receipts"}
              </Text>
              {activeFilterCount > 0 ? (
                <Pressable onPress={clearFilters}>
                  <Text style={styles.clearFilters}>Clear filters</Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.sectionCard,
              index === 0 && styles.sectionCardTop,
              index === section.data.length - 1 && styles.sectionCardBottom,
            ]}
          >
            <ExpenseCompactRow
              item={item}
              colors={colors}
              onPress={() => {
                hapticLight();
                router.push(`/(app)/expense/${item.id}`);
              }}
            />
          </View>
        )}
      />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    topBar: {
      paddingHorizontal: spacing.md,
      paddingBottom: 8,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    pageTitle: { fontSize: 24, fontWeight: "800", color: colors.text, letterSpacing: -0.4 },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
    list: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
    headerBlock: { gap: spacing.sm, marginBottom: spacing.md },
    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: 4,
    },
    summaryTotal: { fontSize: 28, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
    summaryLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
    summaryBreakdown: { marginTop: spacing.sm, gap: 6 },
    breakdownItem: { flexDirection: "row", alignItems: "center", gap: 8 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendPending: { backgroundColor: colors.primary },
    legendSubmitted: { backgroundColor: colors.textSecondary },
    breakdownText: { fontSize: 12, color: colors.textSecondary },
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
    searchInput: { flex: 1, paddingVertical: 11, fontSize: 15, color: colors.text },
    filterToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    filterToggleText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
    filterChevron: { marginLeft: "auto" },
    filterBadge: {
      backgroundColor: colors.primary,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
    },
    filterBadgeText: { fontSize: 11, fontWeight: "800", color: colors.onPrimary },
    filterPanel: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    filterLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    chipRow: { gap: 8, paddingVertical: 2 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipEmoji: { fontSize: 13 },
    chipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
    chipTextActive: { color: colors.onPrimary },
    clearBtn: { alignItems: "center", paddingTop: 4 },
    clearFilters: { fontSize: 13, color: colors.primary, fontWeight: "700" },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
      paddingHorizontal: 4,
      backgroundColor: colors.bg,
    },
    sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase" },
    sectionCount: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    sectionCard: {
      marginHorizontal: 0,
      overflow: "hidden",
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    sectionCardTop: {
      borderTopWidth: 1,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
    },
    sectionCardBottom: {
      borderBottomWidth: 1,
      borderBottomLeftRadius: radius.lg,
      borderBottomRightRadius: radius.lg,
      marginBottom: spacing.md,
    },
    empty: { alignItems: "center", paddingVertical: 48, gap: 8 },
    emptyEmoji: { fontSize: 40 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  });
}
