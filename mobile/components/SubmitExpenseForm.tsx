import { useCallback, useState } from "react";
import {
  Alert,
  Image,
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
  type CompanyValue,
  type Profile,
} from "../lib/types";
import { getErrorMessage, toIsoDate } from "../lib/utils";
import { colors, radius, spacing } from "../constants/theme";
import { Button } from "./Button";
import { CompanyPicker } from "./CompanyPicker";
import { ReceiptAnalyzingView } from "./ReceiptAnalyzingView";

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
  const [step, setStep] = useState<Step>("scan");
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ReceiptAnalysisResult | null>(null);
  const [merchantName, setMerchantName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategoryKey>("misc");
  const [company, setCompany] = useState<CompanyValue>(
    (profile.company as CompanyValue) || getDefaultCompanyForRegion(profile.region)
  );
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [relatedTo, setRelatedTo] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const parsedTotal = parseFloat(totalAmount.replace(/[^0-9.]/g, "")) || 0;
  const itemCount = analysis?.line_items.length ?? 0;

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

        if (!data?.analysis) throw new Error("AI returned no analysis");

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

  function cycleCategory() {
    const idx = EXPENSE_CATEGORIES.findIndex((c) => c.key === category);
    setCategory(EXPENSE_CATEGORIES[(idx + 1) % EXPENSE_CATEGORIES.length].key);
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
    setSubmitting(true);
    try {
      await submitExpense(userId, {
        amount: parsedTotal,
        category,
        description: merchantName.trim() || "Receipt",
        expenseDate,
        relatedTo: relatedTo.trim() || undefined,
        receiptUrl: receiptPath,
        company,
      });
      Alert.alert("Saved!", "Your receipt has been added as one expense.");
      onSubmitted();
    } catch (err) {
      Alert.alert("Could not save", getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function resetScan() {
    setStep("scan");
    setPreviewUri(null);
    setAnalysis(null);
    setMerchantName("");
    setTotalAmount("");
    setCategory("misc");
    setRelatedTo("");
    setReceiptPath(null);
    setShowDetails(false);
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.closeBtn}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {step === "scan" ? "Scan Receipt" : step === "analyzing" ? "Analyzing…" : "Confirm & Save"}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {step === "scan" && (
          <View style={[styles.scanStep, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Pressable style={styles.heroScan} onPress={() => scanReceipt(true)}>
              <Text style={styles.heroEmoji}>📷</Text>
              <Text style={styles.heroTitle}>Take a photo of your receipt</Text>
              <Text style={styles.heroSub}>AI reads it and fills in one expense total for you</Text>
            </Pressable>
            <View style={styles.scanActions}>
              <Button title="Open Camera" onPress={() => scanReceipt(true)} style={styles.scanBtn} />
              <Button title="Choose from Photos" variant="outline" onPress={() => scanReceipt(false)} style={styles.scanBtn} />
            </View>
          </View>
        )}

        {step === "analyzing" && previewUri ? <ReceiptAnalyzingView imageUri={previewUri} /> : null}

        {step === "review" && analysis ? (
          <ScrollView
            contentContainerStyle={[styles.reviewContent, { paddingBottom: insets.bottom + 100 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {previewUri ? <Image source={{ uri: previewUri }} style={styles.reviewThumb} /> : null}

            <View style={styles.merchantCard}>
              <TextInput
                style={styles.merchantNameInput}
                value={merchantName}
                onChangeText={setMerchantName}
                placeholder="Merchant name"
                placeholderTextColor={colors.slate400}
              />
              <View style={styles.totalRow}>
                <Text style={styles.currencySign}>$</Text>
                <TextInput
                  style={styles.totalInput}
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.slate400}
                />
              </View>
              <Pressable onPress={cycleCategory} style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{EXPENSE_CATEGORY_LABELS[category]}</Text>
                <Text style={styles.categoryPillTap}> ▾ tap to change</Text>
              </Pressable>
              <Text style={styles.confidence}>
                AI confidence: {Math.round((analysis.confidence ?? 0) * 100)}%
                {itemCount > 1 ? ` · ${itemCount} items detected` : ""}
              </Text>
            </View>

            <CompanyPicker value={company} onChange={setCompany} />

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Date</Text>
              <TextInput
                style={styles.fieldInput}
                value={expenseDate}
                onChangeText={setExpenseDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.slate400}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Business purpose</Text>
              <TextInput
                style={styles.fieldInput}
                value={relatedTo}
                onChangeText={setRelatedTo}
                placeholder="Client, account, or reason"
                placeholderTextColor={colors.slate400}
              />
            </View>

            {itemCount > 1 ? (
              <View style={styles.detailsSection}>
                <Pressable onPress={toggleDetails} style={styles.detailsHeader}>
                  <Text style={styles.detailsTitle}>Item details</Text>
                  <Text style={styles.detailsToggle}>{showDetails ? "Hide" : "Show"} ({itemCount})</Text>
                </Pressable>
                {showDetails ? (
                  <View style={styles.detailsList}>
                    {analysis.line_items.map((item, index) => (
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
                      <Text style={styles.detailTotalAmount}>{formatCurrency(parsedTotal || getAnalysisTotal(analysis))}</Text>
                    </View>
                    <Text style={styles.detailsNote}>For reference only — saves as one expense</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <Pressable onPress={resetScan}>
              <Text style={styles.retake}>↻ Retake photo</Text>
            </Pressable>
          </ScrollView>
        ) : null}

        {step === "review" ? (
          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
            <Button title="Save Expense" onPress={handleSave} loading={submitting} style={styles.saveBtn} />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  closeBtn: { color: colors.white, fontSize: 22, fontWeight: "300", width: 28 },
  headerTitle: { color: colors.white, fontSize: 17, fontWeight: "700" },
  scanStep: { flex: 1, padding: spacing.lg, justifyContent: "center", gap: spacing.lg },
  heroScan: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
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
  reviewContent: { padding: spacing.md, gap: spacing.md },
  reviewThumb: { width: "100%", height: 120, borderRadius: radius.md, resizeMode: "cover" },
  merchantCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
  },
  merchantNameInput: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.slate800,
    textAlign: "center",
    width: "100%",
    padding: 0,
  },
  totalRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 4 },
  currencySign: { fontSize: 28, fontWeight: "800", color: colors.primary, marginTop: 6, marginRight: 2 },
  totalInput: {
    fontSize: 42,
    fontWeight: "800",
    color: colors.primary,
    minWidth: 120,
    padding: 0,
    textAlign: "center",
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8eef5",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    marginTop: 4,
  },
  categoryPillText: { fontSize: 13, fontWeight: "700", color: colors.primary },
  categoryPillTap: { fontSize: 11, color: colors.slate500 },
  confidence: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.slate500 },
  fieldInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.slate800,
  },
  detailsSection: {
    backgroundColor: colors.white,
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
  retake: { color: colors.primary, fontWeight: "600", textAlign: "center", paddingVertical: 8 },
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
  },
  saveBtn: { paddingVertical: 16, borderRadius: radius.lg },
});
