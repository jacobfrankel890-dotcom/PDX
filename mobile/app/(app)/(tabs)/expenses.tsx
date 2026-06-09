import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";
import {
  applyExpenseFilters,
  countActiveExpenseFilters,
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
import { ExpenseFilterSheet } from "../../../components/ExpenseFilterSheet";
import { radius, spacing, type ThemeColors } from "../../../constants/theme";

function countSheetFilters(category: ExpenseCategory | "all", sort: ExpenseSortKey): number {
  let count = 0;
  if (category !== "all") count += 1;
  if (sort !== "newest") count += 1;
  return count;
}

type ListRow =
  | { kind: "header"; id: string; title: string }
  | { kind: "group"; id: string; items: ExpenseEntry[] };

function buildListRows(sections: ReturnType<typeof groupExpensesByMonth>): ListRow[] {
  const rows: ListRow[] = [];
  for (const section of sections) {
    rows.push({ kind: "header", id: `h-${section.sortKey}`, title: section.title });
    rows.push({ kind: "group", id: `g-${section.sortKey}`, items: section.data });
  }
  return rows;
}

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
  const [sheetOpen, setSheetOpen] = useState(false);
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
  const listRows = useMemo(() => buildListRows(sections), [sections]);
  const totals = useMemo(() => sumExpenseTotals(filtered), [filtered]);
  const sheetFilterCount = countSheetFilters(categoryFilter, sort);

  const activeFilterCount = countActiveExpenseFilters({
    query: search,
    category: categoryFilter,
    status: statusFilter,
    sort,
  });

  function clearAllFilters() {
    hapticSelection();
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setSort("newest");
  }

  function clearSheetFilters() {
    hapticSelection();
    setCategoryFilter("all");
    setSort("newest");
  }

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.titleRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.pageTitle}>Expenses</Text>
          <Text style={styles.metaLine}>
            {filtered.length} receipt{filtered.length === 1 ? "" : "s"} · {formatCurrency(totals.total)}
          </Text>
        </View>
        <Pressable
          style={[styles.filterBtn, sheetFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => {
            hapticSelection();
            setSheetOpen(true);
          }}
          hitSlop={8}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={sheetFilterCount > 0 ? colors.primaryDark : colors.text}
          />
          {sheetFilterCount > 0 ? (
            <View style={styles.filterDot}>
              <Text style={styles.filterDotText}>{sheetFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search receipts"
          placeholderTextColor={colors.slate400}
          clearButtonMode="while-editing"
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.segmented}>
        {EXPENSE_STATUS_FILTERS.map((option) => {
          const selected = statusFilter === option.key;
          return (
            <Pressable
              key={option.key}
              style={[styles.segment, selected && styles.segmentActive]}
              onPress={() => {
                hapticSelection();
                setStatusFilter(option.key);
              }}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeFilterCount > 0 ? (
        <Pressable onPress={clearAllFilters} style={styles.clearRow}>
          <Text style={styles.clearText}>Clear filters</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={styles.flex}>
      <FlatList
        data={listRows}
        keyExtractor={(row) => row.id}
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + spacing.sm, paddingBottom: getTabBarStackHeight(insets) + spacing.lg },
        ]}
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
                <Pressable onPress={clearAllFilters}>
                  <Text style={styles.clearText}>Clear filters</Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
        renderItem={({ item: row, index }) => {
          if (row.kind === "header") {
            const prev = listRows[index - 1];
            return (
              <Text style={[styles.sectionTitle, prev?.kind === "group" && styles.sectionTitleSpaced]}>
                {row.title}
              </Text>
            );
          }

          return (
            <View style={styles.sectionCard}>
              {row.items.map((item, itemIndex) => (
                <ExpenseCompactRow
                  key={item.id}
                  item={item}
                  colors={colors}
                  isLast={itemIndex === row.items.length - 1}
                  onPress={() => {
                    hapticLight();
                    router.push(`/(app)/expense/${item.id}`);
                  }}
                />
              ))}
            </View>
          );
        }}
      />

      <ExpenseFilterSheet
        visible={sheetOpen}
        colors={colors}
        category={categoryFilter}
        sort={sort}
        onCategoryChange={setCategoryFilter}
        onSortChange={setSort}
        onClear={clearSheetFilters}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    list: { paddingHorizontal: spacing.md },
    headerBlock: { gap: spacing.md, marginBottom: spacing.lg },
    titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    titleGroup: { flex: 1, gap: 2 },
    pageTitle: { fontSize: 32, fontWeight: "800", color: colors.text, letterSpacing: -0.8 },
    metaLine: { fontSize: 14, color: colors.textSecondary, fontWeight: "500" },
    filterBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 4,
    },
    filterBtnActive: { backgroundColor: colors.greenLight, borderColor: colors.primary },
    filterDot: {
      position: "absolute",
      top: -2,
      right: -2,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    filterDotText: { fontSize: 10, fontWeight: "800", color: colors.onPrimary },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      gap: 10,
      minHeight: 48,
    },
    searchInput: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 12 },
    segmented: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: 4,
      gap: 4,
    },
    segment: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 10,
      borderRadius: radius.sm,
    },
    segmentActive: { backgroundColor: colors.bg },
    segmentText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
    segmentTextActive: { color: colors.text, fontWeight: "700" },
    clearRow: { alignSelf: "flex-start" },
    clearText: { fontSize: 14, fontWeight: "600", color: colors.primary },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    sectionTitleSpaced: { marginTop: spacing.lg },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: "hidden",
      marginBottom: spacing.sm,
    },
    empty: { alignItems: "center", paddingVertical: 56, gap: 10 },
    emptyEmoji: { fontSize: 40 },
    emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  });
}
