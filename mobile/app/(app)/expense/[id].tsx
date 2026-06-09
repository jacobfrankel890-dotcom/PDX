import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { format, parseISO } from "date-fns";
import { type ExpenseCategoryKey } from "../../../lib/categories";
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
import { formatCurrency, getCompanyLabel, normalizeCompanyValue, type CompanyValue } from "../../../lib/types";
import { getErrorMessage } from "../../../lib/utils";
import { useScrollToField } from "../../../lib/use-scroll-to-field";
import { radius, spacing, type ThemeColors } from "../../../constants/theme";
import { Button } from "../../../components/Button";
import { CategoryPicker } from "../../../components/CategoryPicker";
import { CompanyPicker } from "../../../components/CompanyPicker";
import { DateField } from "../../../components/DateField";

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
  const scrollRef = useRef<ScrollView>(null);
  const purposeRef = useRef<TextInputType>(null);
  const { trackFieldLayout, scrollToField } = useScrollToField(scrollRef);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [expense, setExpense] = useState<ExpenseEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [imageExpanded, setImageExpanded] = useState(false);

  const [merchantName, setMerchantName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategoryKey>("misc");
  const [company, setCompany] = useState<CompanyValue>("pdx");
  const [expenseDate, setExpenseDate] = useState("");
  const [relatedTo, setRelatedTo] = useState("");

  const editable = expense ? isExpenseEditable(expense) : false;

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
      setCompany(normalizeCompanyValue(item.company));
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

  const bottomPadding = insets.bottom + spacing.xl + (keyboardVisible ? spacing.lg : 0);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {receiptUri ? (
          <Pressable onPress={() => setImageExpanded(true)} style={styles.receiptImageWrap}>
            <Image source={{ uri: receiptUri }} style={styles.receiptImage} resizeMode="contain" />
            <View style={styles.expandHint}>
              <Text style={styles.expandHintText}>Tap to expand</Text>
            </View>
          </Pressable>
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
          <View style={styles.formCard}>
            <Text style={styles.formSectionLabel}>Details</Text>
            <CategoryPicker value={category} onChange={setCategory} embedded />
            <View style={styles.formDivider} />
            <CompanyPicker value={company} onChange={setCompany} embedded />
            <View style={styles.formDivider} />
            <View onLayout={trackFieldLayout("date")}>
              <DateField
                label="Date"
                value={expenseDate}
                onChange={setExpenseDate}
                embedded
                onPress={() => scrollToField("date")}
              />
            </View>
            <View style={styles.formDivider} />
            <View style={styles.field} onLayout={trackFieldLayout("purpose")}>
              <Text style={styles.fieldLabel}>Business purpose</Text>
              <TextInput
                ref={purposeRef}
                style={[styles.input, styles.inputMultiline]}
                value={relatedTo}
                onChangeText={setRelatedTo}
                placeholder="Client, account, or reason"
                placeholderTextColor={colors.slate400}
                multiline
                textAlignVertical="top"
                onFocus={() => scrollToField("purpose")}
              />
            </View>
          </View>
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

        {editable ? (
          <View style={[styles.footerInline, { paddingBottom: insets.bottom > 0 ? 0 : spacing.sm }]}>
            <Pressable
              onPress={handleDelete}
              disabled={deleting}
              style={({ pressed }) => [styles.footerBtn, styles.deleteBtn, pressed && styles.footerBtnPressed]}
            >
              <Text style={styles.deleteText}>{deleting ? "Deleting…" : "Delete"}</Text>
            </Pressable>
            <Button title="Save" onPress={handleSave} loading={saving} style={styles.footerBtn} />
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={imageExpanded} transparent animationType="fade" onRequestClose={() => setImageExpanded(false)}>
        <View style={styles.imageModal}>
          <Pressable style={styles.imageModalBackdrop} onPress={() => setImageExpanded(false)} />
          {receiptUri ? (
            <Image source={{ uri: receiptUri }} style={styles.imageModalImage} resizeMode="contain" />
          ) : null}
          <Pressable
            style={[styles.imageModalClose, { top: insets.top + spacing.sm }]}
            onPress={() => setImageExpanded(false)}
            hitSlop={12}
          >
            <Text style={styles.imageModalCloseText}>✕</Text>
          </Pressable>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
    content: { padding: spacing.md, gap: spacing.md, flexGrow: 1 },
    receiptImageWrap: {
      borderRadius: radius.md,
      overflow: "hidden",
      backgroundColor: colors.border,
    },
    receiptImage: {
      width: "100%",
      height: 220,
    },
    expandHint: {
      position: "absolute",
      right: 8,
      bottom: 8,
      backgroundColor: "rgba(0,0,0,0.55)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.full,
    },
    expandHintText: { color: "#fff", fontSize: 11, fontWeight: "600" },
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
    statusLocked: { backgroundColor: colors.greenLight },
    statusText: { fontSize: 12, fontWeight: "700" },
    statusTextPending: { color: colors.primaryDark },
    statusTextLocked: { color: colors.primaryDark },
    readOnlyHint: { fontSize: 13, color: colors.slate500 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    formSectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 2,
      marginLeft: 2,
    },
    formDivider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginTop: 4 },
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
    inputMultiline: { minHeight: 88, paddingTop: 12 },
    amountRow: { flexDirection: "row", alignItems: "center" },
    currency: { fontSize: 28, fontWeight: "800", color: colors.primary, marginRight: 4 },
    amountInput: {
      flex: 1,
      fontSize: 32,
      fontWeight: "800",
      color: colors.primary,
      padding: 0,
    },
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
    footerInline: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    footerBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: radius.lg,
      alignItems: "center",
      justifyContent: "center",
    },
    footerBtnPressed: { opacity: 0.85 },
    deleteBtn: {
      borderWidth: 2,
      borderColor: colors.error,
      backgroundColor: "transparent",
    },
    deleteText: { color: colors.error, fontSize: 16, fontWeight: "700" },
    imageModal: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.92)",
      justifyContent: "center",
    },
    imageModalBackdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    imageModalImage: {
      width: "100%",
      height: "100%",
    },
    imageModalClose: {
      position: "absolute",
      right: spacing.md,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    imageModalCloseText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  });
}
