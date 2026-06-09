import { useCallback, useMemo, useRef, useState } from "react";
import {
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
import {
  fetchRecentExpenses,
  type ExpenseCategory,
  type ExpenseEntry,
} from "../../../lib/expenses";
import { hapticLight, hapticSelection } from "../../../lib/haptics";
import { ListGap } from "../../../lib/list-separator";
import { useTheme } from "../../../lib/settings-context";
import { getTabBarStackHeight } from "../../../lib/tab-bar-layout";
import { ExpenseListCard } from "../../../components/ExpenseListCard";
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
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search merchant, category, date…"
          placeholderTextColor={colors.slate400}
          clearButtonMode="while-editing"
        />
      </View>

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

      <View style={styles.metaRow}>
        <Text style={styles.resultCount}>
          {filtered.length} receipt{filtered.length === 1 ? "" : "s"}
          {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"}` : ""}
        </Text>
        {activeFilterCount > 0 ? (
          <Pressable onPress={clearFilters} hitSlop={8}>
            <Text style={styles.clearFilters}>Clear all</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.pageTitle}>Expenses</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id!}
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: getTabBarStackHeight(insets) + spacing.lg }]}
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
    list: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
    headerBlock: { gap: spacing.sm, marginBottom: spacing.sm },
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
    searchInput: { flex: 1, paddingVertical: 11, fontSize: 15, color: colors.text },
    filterLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginTop: 2,
    },
    chipRow: { gap: 8, paddingVertical: 2 },
    chip: {
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
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipEmoji: { fontSize: 13 },
    chipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
    chipTextActive: { color: colors.onPrimary },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 2,
    },
    resultCount: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
    clearFilters: { fontSize: 13, color: colors.primary, fontWeight: "700" },
    empty: { alignItems: "center", paddingVertical: 48, gap: 8 },
    emptyEmoji: { fontSize: 40 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  });
}
