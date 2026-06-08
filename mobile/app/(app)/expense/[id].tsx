import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { format, parseISO } from "date-fns";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, type ExpenseCategoryKey } from "../../../lib/categories";
import {
  deleteExpenseLineItem,
  fetchExpenseById,
  getCategoryFromItem,
  getCategoryLabel,
  getReceiptImageUrl,
  isExpenseEditable,
  updateExpenseLineItem,
  type ExpenseEntry,
} from "../../../lib/expenses";
import { useTheme } from "../../../lib/settings-context";
import { formatCurrency, getCompanyLabel, type CompanyValue } from "../../../lib/types";
import { getErrorMessage } from "../../../lib/utils";
import { radius, spacing, type ThemeColors } from "../../../constants/theme";
import { Button } from "../../../components/Button";
import { CompanyPicker } from "../../../components/CompanyPicker";

function formatDisplayDate(d: string | null | undefined): string {
  if (!d) return "";
  try {
    return format(parseISO(d), "MMMM d, yyyy");
  } catch {
    return d;
  }
}

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [expense, setExpense] = useState<ExpenseEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  const [merchantName, setMerchantName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategoryKey>("misc");
  const [company, setCompany] = useState<CompanyValue>("Parts Distribution Xpress");
  const [expenseDate, setExpenseDate] = useState("");
  const [relatedTo, setRelatedTo] = useState("");

  const editable = expense ? isExpenseEditable(expense) : false;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const item = await fetchExpenseById(id);
      if (!item) {
        Alert.alert("Not found", "This receipt no longer exists.", [
          { text: "OK", onPress: () => router.back() },
        ]);
        return;
      }
      setExpense(item);
      setMerchantName(item.description ?? "");
      setTotalAmount(String(item.row_total ?? 0));
      setCategory(getCategoryFromItem(item));
      setCompany((item.company as CompanyValue) || "Parts Distribution Xpress");
      setExpenseDate(item.expense_date ?? "");
      setRelatedTo(item.related_to ?? "");

      if (item.receipt_url) {
        const url = await getReceiptImageUrl(item.receipt_url);
        setReceiptUri(url);
      } else {
        setReceiptUri(null);
      }
    } catch (err) {
      Alert.alert("Could not load", getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function cycleCategory() {
    const idx = EXPENSE_CATEGORIES.findIndex((c) => c.key === category);
    setCategory(EXPENSE_CATEGORIES[(idx + 1) % EXPENSE_CATEGORIES.length].key);
  }

  async function handleSave() {
    if (!expense?.id || !editable) return;
    const amount = parseFloat(totalAmount.replace(/[^0-9.]/g, "")) || 0;
    if (amount <= 0) {
      Alert.alert("Invalid amount", "Enter a total greater than zero.");
      return;
    }
    setSaving(true);
    try {
      await updateExpenseLineItem(expense.id, {
        description: merchantName,
        amount,
        category,
        expenseDate,
        relatedTo,
        company,
      });
      Alert.alert("Saved", "Receipt updated.");
      router.back();
    } catch (err) {
      Alert.alert("Could not save", getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!expense?.id || !editable) return;
    Alert.alert(
      "Delete receipt?",
      "This will permanently remove this expense. You can't undo this.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteExpenseLineItem(expense.id!);
              router.back();
            } catch (err) {
              Alert.alert("Could not delete", getErrorMessage(err));
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!expense) return null;

  const statusLabel =
    expense.report_status === "draft"
      ? "Pending"
      : expense.report_status === "submitted"
        ? "Submitted"
        : expense.report_status ?? "";

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (editable ? 120 : 40) }]}
        keyboardShouldPersistTaps="handled"
      >
        {receiptUri ? (
          <Image source={{ uri: receiptUri }} style={styles.receiptImage} resizeMode="contain" />
        ) : (
          <View style={styles.noReceipt}>
            <Text style={styles.noReceiptEmoji}>🧾</Text>
            <Text style={styles.noReceiptText}>No receipt image</Text>
          </View>
        )}

        <View style={styles.statusRow}>
          <View style={[styles.statusPill, editable ? styles.statusPending : styles.statusLocked]}>
            <Text style={[styles.statusText, editable ? styles.statusTextPending : styles.statusTextLocked]}>
              {statusLabel}
            </Text>
          </View>
          {!editable ? (
            <Text style={styles.readOnlyHint}>Submitted — view only</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          {editable ? (
            <>
              <Text style={styles.fieldLabel}>Merchant</Text>
              <TextInput
                style={styles.input}
                value={merchantName}
                onChangeText={setMerchantName}
                placeholder="Merchant name"
                placeholderTextColor={colors.slate400}
              />
              <Text style={styles.fieldLabel}>Amount</Text>
              <View style={styles.amountRow}>
                <Text style={styles.currency}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.slate400}
                />
              </View>
              <Pressable onPress={cycleCategory} style={styles.categoryPill}>
                <Text style={styles.categoryText}>{EXPENSE_CATEGORY_LABELS[category]}</Text>
                <Text style={styles.categoryTap}> ▾ change</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.merchantReadonly}>{merchantName || "Expense"}</Text>
              <Text style={styles.amountReadonly}>{formatCurrency(expense.row_total)}</Text>
              <Text style={styles.categoryReadonly}>{getCategoryLabel(expense)}</Text>
            </>
          )}
        </View>

        {editable ? (
          <>
            <CompanyPicker value={company} onChange={setCompany} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Date</Text>
              <TextInput
                style={styles.input}
                value={expenseDate}
                onChangeText={setExpenseDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.slate400}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Business purpose</Text>
              <TextInput
                style={styles.input}
                value={relatedTo}
                onChangeText={setRelatedTo}
                placeholder="Client, account, or reason"
                placeholderTextColor={colors.slate400}
              />
            </View>
          </>
        ) : (
          <View style={styles.detailsCard}>
            {expense.company ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Company</Text>
                <Text style={styles.detailValue}>{getCompanyLabel(expense.company)}</Text>
              </View>
            ) : null}
            {expense.expense_date ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{formatDisplayDate(expense.expense_date)}</Text>
              </View>
            ) : null}
            {relatedTo ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Business purpose</Text>
                <Text style={styles.detailValue}>{relatedTo}</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {editable ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button title="Save changes" onPress={handleSave} loading={saving} style={styles.saveBtn} />
          <Pressable onPress={handleDelete} disabled={deleting} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>{deleting ? "Deleting…" : "Delete receipt"}</Text>
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
    content: { padding: spacing.md, gap: spacing.md },
    receiptImage: {
      width: "100%",
      height: 220,
      borderRadius: radius.md,
      backgroundColor: colors.border,
    },
    noReceipt: {
      height: 120,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    noReceiptEmoji: { fontSize: 32 },
    noReceiptText: { color: colors.slate500, fontSize: 14 },
    statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
    statusPending: { backgroundColor: colors.greenLight },
    statusLocked: { backgroundColor: "#e0e7ff" },
    statusText: { fontSize: 12, fontWeight: "700" },
    statusTextPending: { color: colors.green },
    statusTextLocked: { color: colors.primaryLight },
    readOnlyHint: { fontSize: 13, color: colors.slate500 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.slate500, marginTop: 4 },
    input: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
    },
    amountRow: { flexDirection: "row", alignItems: "center" },
    currency: { fontSize: 28, fontWeight: "800", color: colors.primary, marginRight: 4 },
    amountInput: {
      flex: 1,
      fontSize: 32,
      fontWeight: "800",
      color: colors.primary,
      padding: 0,
    },
    categoryPill: {
      flexDirection: "row",
      alignSelf: "flex-start",
      backgroundColor: "#e8eef5",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.full,
      marginTop: 4,
    },
    categoryText: { fontSize: 13, fontWeight: "700", color: colors.primary },
    categoryTap: { fontSize: 11, color: colors.slate500 },
    merchantReadonly: { fontSize: 22, fontWeight: "700", color: colors.text, textAlign: "center" },
    amountReadonly: { fontSize: 36, fontWeight: "800", color: colors.primary, textAlign: "center" },
    categoryReadonly: { fontSize: 14, fontWeight: "600", color: colors.slate500, textAlign: "center" },
    field: { gap: 6 },
    detailsCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    detailRow: { gap: 4 },
    detailLabel: { fontSize: 12, fontWeight: "600", color: colors.slate500, textTransform: "uppercase" },
    detailValue: { fontSize: 16, color: colors.text },
    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      backgroundColor: colors.bg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: spacing.sm,
    },
    saveBtn: { paddingVertical: 16, borderRadius: radius.lg },
    deleteBtn: { paddingVertical: 12, alignItems: "center" },
    deleteText: { color: colors.error, fontSize: 16, fontWeight: "700" },
  });
}
