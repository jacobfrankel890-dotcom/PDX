import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import {
  calculateMileage,
  calculateRowTotal,
  createEmptyLineItem,
  formatCurrency,
  type ExpenseLineItem,
  type ExpenseReport,
  type Profile,
} from "../lib/types";
import { colors } from "../constants/theme";
import { Button } from "./Button";
import { Card } from "./Card";
import { ReceiptScanner } from "./ReceiptScanner";

type Props = {
  report: ExpenseReport;
  initialItems: ExpenseLineItem[];
  profile: Profile;
  mileageRate?: number;
  onSaved: () => void;
};

function hasContent(item: ExpenseLineItem): boolean {
  return !!(
    item.expense_date ||
    item.description ||
    item.related_to ||
    item.receipt_url ||
    item.travel_lodging ||
    item.tolls_parking ||
    item.miles ||
    item.office_supplies ||
    item.meals_entertainment ||
    item.vehicle_maintenance ||
    item.marketing ||
    item.misc
  );
}

export function ExpenseReportEditor({
  report,
  initialItems,
  profile,
  mileageRate = 0.67,
  onSaved,
}: Props) {
  const isEditable = report.status === "draft" || report.status === "rejected";
  const [items, setItems] = useState<ExpenseLineItem[]>(() =>
    initialItems.length > 0 ? initialItems : [createEmptyLineItem(0)]
  );
  const [saving, setSaving] = useState(false);
  const [payStart, setPayStart] = useState(report.pay_period_start);
  const [payEnd, setPayEnd] = useState(report.pay_period_end);

  const grandTotal = useMemo(
    () => items.filter(hasContent).reduce((s, i) => s + (i.row_total || 0), 0),
    [items]
  );

  const updateItem = useCallback(
    (index: number, field: keyof ExpenseLineItem, value: string) => {
      setItems((prev) => {
        const next = [...prev];
        const item = { ...next[index] };
        if (field === "miles") {
          const miles = parseFloat(value) || 0;
          item.miles = miles;
          item.mileage_calc = calculateMileage(miles, mileageRate);
        } else if (
          ["travel_lodging", "tolls_parking", "office_supplies", "meals_entertainment", "vehicle_maintenance", "marketing", "misc"].includes(field)
        ) {
          (item as Record<string, unknown>)[field] = parseFloat(value) || 0;
        } else {
          (item as Record<string, unknown>)[field] = value;
        }
        item.row_total = calculateRowTotal(item);
        next[index] = item;
        return next;
      });
    },
    [mileageRate]
  );

  const applyReceiptItems = useCallback((drafts: ExpenseLineItem[]) => {
    setItems((prev) => {
      const next = [...prev];
      let di = 0;
      for (let i = 0; i < next.length && di < drafts.length; i++) {
        if (!hasContent(next[i])) {
          next[i] = { ...drafts[di], sort_order: i };
          di++;
        }
      }
      while (di < drafts.length) {
        next.push({ ...drafts[di], sort_order: next.length });
        di++;
      }
      return next;
    });
  }, []);

  async function save(submit = false) {
    setSaving(true);
    try {
      const { error: re } = await supabase
        .from("expense_reports")
        .update({
          pay_period_start: payStart,
          pay_period_end: payEnd,
          status: submit ? "submitted" : report.status,
          submitted_at: submit ? new Date().toISOString() : report.submitted_at,
        })
        .eq("id", report.id);
      if (re) throw re;

      const filled = items.map((item, i) => ({ ...item, sort_order: i })).filter(hasContent);

      await supabase.from("expense_line_items").delete().eq("report_id", report.id);

      if (filled.length > 0) {
        const { error: ie } = await supabase.from("expense_line_items").insert(
          filled.map((item) => ({
            report_id: report.id,
            sort_order: item.sort_order,
            expense_date: item.expense_date || null,
            description: item.description || null,
            related_to: item.related_to || null,
            travel_lodging: item.travel_lodging || 0,
            tolls_parking: item.tolls_parking || 0,
            miles: item.miles || 0,
            mileage_calc: item.mileage_calc || 0,
            office_supplies: item.office_supplies || 0,
            meals_entertainment: item.meals_entertainment || 0,
            vehicle_maintenance: item.vehicle_maintenance || 0,
            marketing: item.marketing || 0,
            misc: item.misc || 0,
            row_total: item.row_total || 0,
            receipt_url: item.receipt_url || null,
          }))
        );
        if (ie) throw ie;
      }

      Alert.alert("Success", submit ? "Report submitted!" : "Draft saved.");
      onSaved();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Expense Report</Text>
      <Text style={styles.sub}>
        {profile.first_name} {profile.last_name} · {profile.company}
      </Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Pay period start</Text>
        <TextInput style={styles.input} value={payStart} onChangeText={setPayStart} editable={isEditable} placeholder="YYYY-MM-DD" />
        <Text style={styles.label}>Pay period end</Text>
        <TextInput style={styles.input} value={payEnd} onChangeText={setPayEnd} editable={isEditable} placeholder="YYYY-MM-DD" />
      </Card>

      {isEditable && (
        <Card style={styles.card}>
          <ReceiptScanner reportId={report.id} onApply={applyReceiptItems} />
        </Card>
      )}

      {items.map((item, index) =>
        hasContent(item) || isEditable ? (
          <Card key={index} style={styles.card}>
            <Text style={styles.itemTitle}>Line {index + 1}</Text>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={item.expense_date ?? ""}
              onChangeText={(v) => updateItem(index, "expense_date", v)}
              editable={isEditable}
              placeholder="YYYY-MM-DD"
            />
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              value={item.description ?? ""}
              onChangeText={(v) => updateItem(index, "description", v)}
              editable={isEditable}
            />
            <Text style={styles.label}>Related To</Text>
            <TextInput
              style={[styles.input, styles.relatedTo]}
              value={item.related_to ?? ""}
              onChangeText={(v) => updateItem(index, "related_to", v)}
              editable={isEditable}
            />
            {(["travel_lodging", "tolls_parking", "meals_entertainment", "office_supplies", "vehicle_maintenance", "marketing", "misc"] as const).map(
              (key) => (
                <View key={key}>
                  <Text style={styles.label}>{key.replace(/_/g, " ")}</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={item[key] ? String(item[key]) : ""}
                    onChangeText={(v) => updateItem(index, key, v)}
                    editable={isEditable}
                    placeholder="0.00"
                  />
                </View>
              )
            )}
            <Text style={styles.label}>Miles</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={item.miles ? String(item.miles) : ""}
              onChangeText={(v) => updateItem(index, "miles", v)}
              editable={isEditable}
            />
            {item.mileage_calc > 0 && (
              <Text style={styles.calc}>Mileage: {formatCurrency(item.mileage_calc)}</Text>
            )}
            <Text style={styles.rowTotal}>Row total: {formatCurrency(item.row_total)}</Text>
          </Card>
        ) : null
      )}

      {isEditable && (
        <Button
          title="+ Add Line Item"
          variant="outline"
          onPress={() => setItems((p) => [...p, createEmptyLineItem(p.length)])}
        />
      )}

      <Card style={styles.card}>
        <Text style={styles.grandTotal}>Report Total: {formatCurrency(grandTotal)}</Text>
      </Card>

      {isEditable && (
        <View style={styles.actions}>
          <Button title="Save Draft" variant="outline" onPress={() => save(false)} loading={saving} />
          <Button title="Submit Report" onPress={() => save(true)} loading={saving} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", color: colors.primary },
  sub: { fontSize: 14, color: colors.slate500, marginBottom: 8 },
  card: { gap: 8 },
  label: { fontSize: 12, fontWeight: "600", color: colors.slate500, textTransform: "uppercase", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.white,
  },
  relatedTo: { backgroundColor: colors.relatedTo + "44" },
  itemTitle: { fontSize: 16, fontWeight: "600", color: colors.primary },
  calc: { fontSize: 14, color: colors.slate500 },
  rowTotal: { fontSize: 15, fontWeight: "600", marginTop: 8 },
  grandTotal: { fontSize: 20, fontWeight: "700", color: colors.primary, textAlign: "center" },
  actions: { gap: 10 },
});
