import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
  type LayoutChangeEvent,
  type TextInput as TextInputType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { format } from "date-fns";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { analyzeReceipt } from "../lib/api";
import { getOrCreateDraftReport, submitExpense } from "../lib/expenses";
import {
  getAnalysisTotal,
  normalizeAnalysis,
  type ReceiptAnalysisResult,
} from "../lib/receipt-analysis";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategoryKey,
} from "../lib/categories";
import {
  formatCurrency,
  getDefaultCompanyForRegion,
  normalizeCompanyValue,
  type CompanyValue,
  type Profile,
} from "../lib/types";
import { getErrorMessage, toIsoDate } from "../lib/utils";
import { useTheme } from "../lib/settings-context";
import { radius, spacing, type ThemeColors } from "../constants/theme";
import { Button } from "./Button";
import { CategoryPicker } from "./CategoryPicker";
import { CompanyPicker } from "./CompanyPicker";
import { ReceiptAnalyzingView } from "./ReceiptAnalyzingView";
import { ScreenHeader } from "./ScreenHeader";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Step = "scan" | "analyzing" | "review";

type Props = {
  userId: string;
  profile: Profile;
  onSubmitted: () => void;
};

export function SubmitExpenseForm({ userId, profile, onSubmitted }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const scrollRef = useRef<ScrollView>(null);
  const merchantRef = useRef<TextInputType>(null);
  const amountRef = useRef<TextInputType>(null);
  const dateRef = useRef<TextInputType>(null);
  const purposeRef = useRef<TextInputType>(null);
  const fieldOffsets = useRef<Record<string, number>>({});
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [step, setStep] = useState<Step>("scan");
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ReceiptAnalysisResult | null>(null);
  const [merchantName, setMerchantName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategoryKey>("misc");
  const [company, setCompany] = useState<CompanyValue>(
    normalizeCompanyValue(profile.company, profile.region)
  );
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [relatedTo, setRelatedTo] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);

  const parsedTotal = parseFloat(totalAmount.replace(/[^0-9.]/g, "")) || 0;
  const itemCount = analysis?.line_items.length ?? 0;
  const isReviewStep = step === "review" && (Boolean(analysis) || isManualEntry);

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

  const trackFieldLayout = useCallback((key: string) => (e: LayoutChangeEvent) => {
    fieldOffsets.current[key] = e.nativeEvent.layout.y;
  }, []);

  const scrollToField = useCallback((key: string) => {
    const scroll = (delay = 0) => {
      setTimeout(() => {
        if (key === "purpose" || key === "date") {
          scrollRef.current?.scrollToEnd({ animated: true });
          return;
        }
        const y = fieldOffsets.current[key] ?? 0;
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 32), animated: true });
      }, delay);
    };
    requestAnimationFrame(() => scroll(0));
    scroll(280);
  }, []);

  const scanReceipt = useCallback(
    async (useCamera: boolean) => {
      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Allow camera or photos to scan receipts.");
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.5, base64: true });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setPreviewUri(asset.uri);
      setIsManualEntry(false);
      setStep("analyzing");

      try {
        const base64 = asset.base64;
        if (!base64) throw new Error("Could not read receipt image");

        const report = await getOrCreateDraftReport(userId);
        const data = await analyzeReceipt({
          reportId: report.id,
          imageBase64: base64,
          mimeType: asset.mimeType ?? "image/jpeg",
          fileName: asset.fileName ?? `receipt-${Date.now()}.jpg`,
        });

        if (!data?.analysis) throw new Error("Could not read this receipt");

        const normalized = normalizeAnalysis(data.analysis);
        const total = getAnalysisTotal(normalized);
        if (total <= 0) throw new Error("Could not read a total from this receipt");

        setAnalysis(normalized);
        setMerchantName(normalized.merchant_name || "Receipt");
        setTotalAmount(String(total));
        setCategory(normalized.primary_category);
        setRelatedTo(normalized.related_to || "");
        setReceiptPath(data.storagePath);
        setShowDetails(normalized.line_items.length > 1);
        if (normalized.expense_date) {
          const iso = toIsoDate(normalized.expense_date);
          if (iso) setExpenseDate(iso);
        }
        setStep("review");
      } catch (err) {
        Alert.alert("Scan failed", getErrorMessage(err));
        setPreviewUri(null);
        setStep("scan");
      }
    },
    [userId]
  );

  function startManualEntry() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsManualEntry(true);
    setStep("review");
    setPreviewUri(null);
    setAnalysis(null);
    setReceiptPath(null);
    setMerchantName("");
    setTotalAmount("");
    setCategory("misc");
    setRelatedTo("");
    setExpenseDate(format(new Date(), "yyyy-MM-dd"));
    setCompany(normalizeCompanyValue(profile.company, profile.region));
    setShowDetails(false);
  }

  function toggleDetails() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDetails((v) => !v);
  }

  async function handleSave() {
    if (parsedTotal <= 0) {
      Alert.alert("Invalid amount", "Enter a total greater than zero.");
      return;
    }
    if (!merchantName.trim()) {
      Alert.alert("Merchant required", "Enter where this expense occurred (store, vendor, or service).");
      return;
    }
    if (isManualEntry && !relatedTo.trim()) {
      Alert.alert("Business purpose required", "Explain what this expense was for — required when no receipt is attached.");
      return;
    }
    setSubmitting(true);
    try {
      await submitExpense(userId, {
        amount: parsedTotal,
        category,
        description: merchantName.trim(),
        expenseDate,
        relatedTo: relatedTo.trim() || undefined,
        receiptUrl: receiptPath,
        company,
      });
      Alert.alert(
        "Saved!",
        isManualEntry
          ? "Your manual expense has been added."
          : "Your receipt has been added as one expense."
      );
      onSubmitted();
    } catch (err) {
      Alert.alert("Could not save", getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function resetScan() {
    setStep("scan");
    setIsManualEntry(false);
    setPreviewUri(null);
    setAnalysis(null);
    setMerchantName("");
    setTotalAmount("");
    setCategory("misc");
    setRelatedTo("");
    setReceiptPath(null);
    setShowDetails(false);
  }

  const headerTitle =
    step === "scan"
      ? "Scan Receipt"
      : step === "analyzing"
        ? "Analyzing…"
        : isManualEntry
          ? "Enter Expense"
          : "Confirm & Save";

  return (
    <View style={styles.flex}>
      <View style={{ paddingTop: insets.top, backgroundColor: colors.surface }}>
        <ScreenHeader title={headerTitle} onClose={() => router.back()} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {step === "scan" && (
          <View style={[styles.scanStep, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Pressable style={styles.heroScan} onPress={() => scanReceipt(true)}>
              <Text style={styles.heroEmoji}>📷</Text>
              <Text style={styles.heroTitle}>Take a photo of your receipt</Text>
              <Text style={styles.heroSub}>We'll read it and fill in one expense total for you</Text>
            </Pressable>
            <View style={styles.scanActions}>
              <Button title="Open Camera" onPress={() => scanReceipt(true)} style={styles.scanBtn} />
              <Button title="Choose from Photos" variant="outline" onPress={() => scanReceipt(false)} style={styles.scanBtn} />
            </View>

            <View style={styles.manualDivider}>
              <View style={styles.manualDividerLine} />
              <Text style={styles.manualDividerText}>or</Text>
              <View style={styles.manualDividerLine} />
            </View>

            <Pressable style={styles.manualCard} onPress={startManualEntry}>
              <Text style={styles.manualIcon}>📝</Text>
              <View style={styles.manualTextWrap}>
                <Text style={styles.manualTitle}>Lost your receipt?</Text>
                <Text style={styles.manualSub}>Enter merchant, amount, and details manually</Text>
              </View>
              <Text style={styles.manualChevron}>›</Text>
            </Pressable>
          </View>
        )}

        {step === "analyzing" && previewUri ? <ReceiptAnalyzingView imageUri={previewUri} /> : null}

        {isReviewStep ? (
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={[
              styles.reviewContent,
              {
                paddingBottom: insets.bottom + spacing.xl + (keyboardVisible ? spacing.lg : 0),
              },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
          >
            {isManualEntry ? (
              <View style={styles.manualBanner}>
                <Text style={styles.manualBannerIcon}>⚠️</Text>
                <View style={styles.manualBannerText}>
                  <Text style={styles.manualBannerTitle}>No receipt attached</Text>
                  <Text style={styles.manualBannerSub}>
                    Business purpose is required for manual entries.
                  </Text>
                </View>
              </View>
            ) : null}

            {previewUri ? <Image source={{ uri: previewUri }} style={styles.reviewThumb} /> : null}

            <View style={[styles.merchantCard, isManualEntry && styles.merchantCardManual]}>
              <View style={styles.merchantCardInner} onLayout={trackFieldLayout("merchant")}>
                <Text style={styles.merchantLabel}>{isManualEntry ? "Merchant / vendor" : "Merchant"}</Text>
                <TextInput
                  ref={merchantRef}
                  style={[styles.merchantNameInput, isManualEntry && styles.merchantNameInputManual]}
                  value={merchantName}
                  onChangeText={setMerchantName}
                  placeholder={isManualEntry ? "e.g. Starbucks, Shell, Amazon" : "Merchant name"}
                  placeholderTextColor={colors.slate400}
                  onFocus={() => scrollToField("merchant")}
                  returnKeyType="next"
                  onSubmitEditing={() => amountRef.current?.focus()}
                />
              </View>
              <View style={styles.amountDivider} />
              <View style={styles.totalRow} onLayout={trackFieldLayout("amount")}>
                <Text style={styles.currencySign}>$</Text>
                <TextInput
                  ref={amountRef}
                  style={styles.totalInput}
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.slate400}
                  onFocus={() => scrollToField("amount")}
                />
              </View>
              {itemCount > 1 ? (
                <Text style={styles.metaHint}>{itemCount} line items detected</Text>
              ) : null}
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formSectionLabel}>Details</Text>
              <CategoryPicker value={category} onChange={setCategory} embedded />
              <View style={styles.formDivider} />
              <CompanyPicker value={company} onChange={setCompany} embedded />
              <View style={styles.formDivider} />
              <View style={styles.field} onLayout={trackFieldLayout("date")}>
                <Text style={styles.fieldLabel}>Date</Text>
                <TextInput
                  ref={dateRef}
                  style={styles.fieldInput}
                  value={expenseDate}
                  onChangeText={setExpenseDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.slate400}
                  onFocus={() => scrollToField("date")}
                  returnKeyType="next"
                  onSubmitEditing={() => purposeRef.current?.focus()}
                />
              </View>
              <View style={styles.formDivider} />
              <View style={styles.field} onLayout={trackFieldLayout("purpose")}>
                <Text style={styles.fieldLabel}>
                  Business purpose{isManualEntry ? " *" : ""}
                </Text>
                <TextInput
                  ref={purposeRef}
                  style={[styles.fieldInput, isManualEntry && styles.fieldInputMultiline]}
                  value={relatedTo}
                  onChangeText={setRelatedTo}
                  placeholder={isManualEntry ? "Client visit, team lunch, supplies for…" : "Client, account, or reason"}
                  placeholderTextColor={colors.slate400}
                  multiline={isManualEntry}
                  textAlignVertical={isManualEntry ? "top" : "center"}
                  onFocus={() => scrollToField("purpose")}
                />
              </View>
            </View>

            {!isManualEntry && itemCount > 1 ? (
              <View style={styles.detailsSection}>
                <Pressable onPress={toggleDetails} style={styles.detailsHeader}>
                  <Text style={styles.detailsTitle}>Item details</Text>
                  <Text style={styles.detailsToggle}>{showDetails ? "Hide" : "Show"} ({itemCount})</Text>
                </Pressable>
                {showDetails ? (
                  <View style={styles.detailsList}>
                    {analysis?.line_items.map((item, index) => (
                      <View key={index} style={styles.detailRow}>
                        <View style={styles.detailLeft}>
                          <Text style={styles.detailDesc} numberOfLines={2}>
                            {item.description}
                          </Text>
                          <Text style={styles.detailCat}>
                            {EXPENSE_CATEGORY_LABELS[item.category as ExpenseCategoryKey] ?? item.category}
                          </Text>
                        </View>
                        <Text style={styles.detailAmount}>{formatCurrency(item.amount)}</Text>
                      </View>
                    ))}
                    <View style={styles.detailTotalRow}>
                      <Text style={styles.detailTotalLabel}>Receipt total</Text>
                      <Text style={styles.detailTotalAmount}>{formatCurrency(parsedTotal || getAnalysisTotal(analysis!))}</Text>
                    </View>
                    <Text style={styles.detailsNote}>For reference only — saves as one expense</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {isManualEntry ? (
              <Pressable onPress={resetScan} style={styles.altAction}>
                <Text style={styles.retake}>← Scan receipt instead</Text>
              </Pressable>
            ) : (
              <Pressable onPress={resetScan} style={styles.altAction}>
                <Text style={styles.retake}>↻ Retake photo</Text>
              </Pressable>
            )}

            <Button
              title={isManualEntry ? "Save Manual Expense" : "Save Expense"}
              onPress={handleSave}
              loading={submitting}
              style={styles.saveBtnInline}
            />
          </ScrollView>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scanStep: { flex: 1, padding: spacing.lg, justifyContent: "center", gap: spacing.lg },
  heroScan: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  heroEmoji: { fontSize: 56 },
  heroTitle: { fontSize: 20, fontWeight: "700", color: colors.primary, textAlign: "center" },
  heroSub: { fontSize: 15, color: colors.slate500, textAlign: "center", lineHeight: 22 },
  scanActions: { gap: spacing.sm },
  scanBtn: { paddingVertical: 16 },
  manualDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  manualDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  manualDividerText: { fontSize: 13, fontWeight: "600", color: colors.slate400, textTransform: "uppercase" },
  manualCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  manualIcon: { fontSize: 28 },
  manualTextWrap: { flex: 1, gap: 2 },
  manualTitle: { fontSize: 16, fontWeight: "700", color: colors.primary },
  manualSub: { fontSize: 13, color: colors.slate500, lineHeight: 18 },
  manualChevron: { fontSize: 24, fontWeight: "300", color: colors.slate400 },
  manualBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: "#fffbeb",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#fde68a",
    padding: spacing.md,
  },
  manualBannerIcon: { fontSize: 18, marginTop: 1 },
  manualBannerText: { flex: 1, gap: 2 },
  manualBannerTitle: { fontSize: 14, fontWeight: "700", color: "#92400e" },
  manualBannerSub: { fontSize: 13, color: "#b45309", lineHeight: 18 },
  reviewContent: { padding: spacing.md, gap: spacing.md, flexGrow: 1 },
  reviewThumb: { width: "100%", height: 120, borderRadius: radius.lg, resizeMode: "cover" },
  merchantCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  merchantCardManual: { alignItems: "stretch" },
  merchantCardInner: { width: "100%", gap: 6 },
  amountDivider: {
    width: "100%",
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  merchantLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate500,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  merchantNameInput: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.slate800,
    textAlign: "center",
    width: "100%",
    padding: 0,
  },
  merchantNameInputManual: { fontSize: 22, textAlign: "left" },
  totalRow: { flexDirection: "row", alignItems: "flex-start", width: "100%" },
  currencySign: { fontSize: 32, fontWeight: "800", color: colors.primary, marginTop: 4, marginRight: 4 },
  totalInput: {
    flex: 1,
    fontSize: 44,
    fontWeight: "800",
    color: colors.primary,
    padding: 0,
    textAlign: "left",
  },
  metaHint: { fontSize: 13, color: colors.slate500, marginTop: 2, alignSelf: "center" },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  formSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
    marginLeft: 2,
  },
  formDivider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.slate500, marginLeft: 2 },
  fieldInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.slate800,
  },
  fieldInputMultiline: { minHeight: 96, paddingTop: 13 },
  detailsSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
  },
  detailsTitle: { fontSize: 14, fontWeight: "700", color: colors.slate800 },
  detailsToggle: { fontSize: 13, fontWeight: "600", color: colors.primary },
  detailsList: { borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md, gap: 10 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  detailLeft: { flex: 1, gap: 2 },
  detailDesc: { fontSize: 14, color: colors.slate700, fontWeight: "500" },
  detailCat: { fontSize: 11, color: colors.slate500, fontWeight: "600" },
  detailAmount: { fontSize: 15, fontWeight: "700", color: colors.slate800 },
  detailTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 4,
  },
  detailTotalLabel: { fontSize: 13, fontWeight: "600", color: colors.slate500 },
  detailTotalAmount: { fontSize: 16, fontWeight: "800", color: colors.primary },
  detailsNote: { fontSize: 11, color: colors.slate400, textAlign: "center", marginTop: 4 },
  retake: { color: colors.primary, fontWeight: "600", textAlign: "center" },
  altAction: { alignItems: "center", paddingVertical: spacing.xs },
  saveBtnInline: { paddingVertical: 16, borderRadius: radius.lg, marginTop: spacing.xs },
  });
}
