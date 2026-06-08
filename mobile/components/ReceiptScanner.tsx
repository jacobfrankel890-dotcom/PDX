import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { analyzeReceipt } from "../lib/api";
import {
  analysisToLineItems,
  RECEIPT_CATEGORIES,
  RECEIPT_CATEGORY_LABELS,
  type ReceiptAnalysisResult,
} from "../lib/receipt-analysis";
import { formatCurrency, type ExpenseLineItem } from "../lib/types";
import { colors } from "../constants/theme";
import { Button } from "./Button";

type Props = {
  reportId: string;
  disabled?: boolean;
  onApply: (items: ExpenseLineItem[]) => void;
};

export function ReceiptScanner({ reportId, disabled, onApply }: Props) {
  const [loading, setLoading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ReceiptAnalysisResult | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);

  const pickImage = useCallback(
    async (useCamera: boolean) => {
      if (disabled) return;

      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!perm.granted) {
        Alert.alert("Permission needed", "Allow camera/photos to scan receipts.");
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.8, base64: true })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, base64: true });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setPreviewUri(asset.uri);
      setAnalysis(null);
      setLoading(true);

      try {
        const base64 = asset.base64;
        if (!base64) throw new Error("Could not read receipt image");
        const mimeType = asset.mimeType ?? "image/jpeg";
        const fileName = asset.fileName ?? `receipt-${Date.now()}.jpg`;

        const data = await analyzeReceipt({
          reportId,
          imageBase64: base64,
          mimeType,
          fileName,
        });

        setAnalysis(data.analysis);
        setStoragePath(data.storagePath);
      } catch (err) {
        Alert.alert("Scan failed", err instanceof Error ? err.message : "Could not analyze receipt");
        setPreviewUri(null);
      } finally {
        setLoading(false);
      }
    },
    [disabled, reportId]
  );

  function handleApply() {
    if (!analysis) return;
    onApply(analysisToLineItems(analysis, storagePath));
    setPreviewUri(null);
    setAnalysis(null);
    setStoragePath(null);
    Alert.alert("Added", "Receipt items added to your report.");
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>AI Receipt Scanner</Text>
      <Text style={styles.sub}>Take or upload a photo — AI categorizes it for you</Text>

      <View style={styles.row}>
        <Button title="Camera" onPress={() => pickImage(true)} disabled={disabled || loading} style={styles.half} />
        <Button
          title="Photo Library"
          variant="outline"
          onPress={() => pickImage(false)}
          disabled={disabled || loading}
          style={styles.half}
        />
      </View>

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Analyzing receipt…</Text>
        </View>
      )}

      {previewUri && analysis && !loading && (
        <View style={styles.result}>
          <Image source={{ uri: previewUri }} style={styles.thumb} />
          <Text style={styles.merchant}>{analysis.merchant_name}</Text>
          <Text style={styles.total}>{formatCurrency(analysis.total_amount)}</Text>
          <Text style={styles.meta}>Related to: {analysis.related_to}</Text>
          <Text style={styles.meta}>
            Confidence: {Math.round(analysis.confidence * 100)}%
          </Text>
          {analysis.line_items.map((item, i) => (
            <Text key={i} style={styles.lineItem}>
              • {item.description} — {formatCurrency(item.amount)} (
              {RECEIPT_CATEGORY_LABELS[item.category]})
            </Text>
          ))}
          <Button title="Add to Report" onPress={handleApply} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  heading: { fontSize: 18, fontWeight: "700", color: colors.primary },
  sub: { fontSize: 14, color: colors.slate500 },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  loading: { alignItems: "center", padding: 24, gap: 12 },
  loadingText: { color: colors.slate500 },
  result: { gap: 8, padding: 12, backgroundColor: colors.bg, borderRadius: 12 },
  thumb: { width: "100%", height: 160, borderRadius: 8, resizeMode: "cover" },
  merchant: { fontSize: 17, fontWeight: "600", color: colors.slate800 },
  total: { fontSize: 22, fontWeight: "700", color: colors.primary },
  meta: { fontSize: 13, color: colors.slate500 },
  lineItem: { fontSize: 13, color: colors.slate700 },
});
