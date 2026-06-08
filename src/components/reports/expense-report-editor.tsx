"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  calculateMileage,
  calculateRowTotal,
  createEmptyLineItem,
  DEFAULT_LINE_ITEM_COUNT,
  DEFAULT_MILEAGE_RATE,
  EXPENSE_COLUMNS,
  formatCurrency,
  type ExpenseLineItem,
  type ExpenseReport,
  type Profile,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ReceiptUploadPanel,
  type AppliedLineItemDraft,
} from "@/components/reports/receipt-upload-panel";
import {
  Download,
  Plus,
  Save,
  Send,
  Trash2,
  AlertCircle,
  Receipt,
} from "lucide-react";

interface LineItemDraft extends Omit<ExpenseLineItem, "id" | "report_id"> {
  id?: string;
  _isNew?: boolean;
}

interface ExpenseReportEditorProps {
  report: ExpenseReport;
  lineItems: ExpenseLineItem[];
  profile: Profile;
  mileageRate?: number;
}

export function ExpenseReportEditor({
  report: initialReport,
  lineItems: initialLineItems,
  profile,
  mileageRate = DEFAULT_MILEAGE_RATE,
}: ExpenseReportEditorProps) {
  const router = useRouter();
  const [report, setReport] = useState(initialReport);
  const [items, setItems] = useState<LineItemDraft[]>(() => {
    const existing: LineItemDraft[] = initialLineItems.map((item) => ({ ...item }));
    while (existing.length < DEFAULT_LINE_ITEM_COUNT) {
      existing.push({ ...createEmptyLineItem(existing.length), _isNew: true });
    }
    return existing;
  });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  const isEditable = report.status === "draft" || report.status === "rejected";

  const totals = useMemo(() => {
    const filled = items.filter(hasContent);
    return {
      travel_lodging: sum(filled, "travel_lodging"),
      tolls_parking: sum(filled, "tolls_parking"),
      miles: sum(filled, "miles"),
      mileage_calc: sum(filled, "mileage_calc"),
      office_supplies: sum(filled, "office_supplies"),
      meals_entertainment: sum(filled, "meals_entertainment"),
      vehicle_maintenance: sum(filled, "vehicle_maintenance"),
      marketing: sum(filled, "marketing"),
      misc: sum(filled, "misc"),
      grand_total: sum(filled, "row_total"),
    };
  }, [items]);

  const updateItem = useCallback(
    (index: number, field: keyof LineItemDraft, value: string | number) => {
      setItems((prev) => {
        const next = [...prev];
        const item = { ...next[index] };

        if (field === "miles") {
          const miles = parseFloat(String(value)) || 0;
          item.miles = miles;
          item.mileage_calc = calculateMileage(miles, mileageRate);
        } else if (
          [
            "travel_lodging",
            "tolls_parking",
            "office_supplies",
            "meals_entertainment",
            "vehicle_maintenance",
            "marketing",
            "misc",
          ].includes(field)
        ) {
          (item as Record<string, unknown>)[field] = parseFloat(String(value)) || 0;
        } else {
          (item as Record<string, unknown>)[field] = value;
        }

        item.row_total = calculateRowTotal(item);
        next[index] = item;
        return next;
      });
      setDirty(true);
    },
    [mileageRate]
  );

  const addRow = () => {
    setItems((prev) => [...prev, { ...createEmptyLineItem(prev.length), _isNew: true }]);
    setDirty(true);
  };

  const removeRow = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((item, i) => ({ ...item, sort_order: i }));
    });
    setDirty(true);
  };

  const applyReceiptItems = useCallback((drafts: AppliedLineItemDraft[]) => {
    setItems((prev) => {
      const next = [...prev];
      let draftIndex = 0;

      for (let i = 0; i < next.length && draftIndex < drafts.length; i++) {
        if (!hasContent(next[i])) {
          const draft = drafts[draftIndex];
          next[i] = {
            ...next[i],
            ...draft,
            sort_order: i,
            miles: 0,
            mileage_calc: 0,
            row_total: draft.row_total,
          };
          draftIndex++;
        }
      }

      while (draftIndex < drafts.length) {
        const draft = drafts[draftIndex];
        next.push({
          ...createEmptyLineItem(next.length),
          ...draft,
          sort_order: next.length,
          miles: 0,
          mileage_calc: 0,
          row_total: draft.row_total,
          _isNew: true,
        });
        draftIndex++;
      }

      return next;
    });
    setDirty(true);
    setMessage({ type: "success", text: `Added ${drafts.length} expense row(s) from receipt.` });
  }, []);

  async function saveReport(submit = false) {
    if (submit) setSubmitting(true);
    else setSaving(true);
    setMessage(null);

    try {
      const supabase = createClient();

      const { error: reportError } = await supabase
        .from("expense_reports")
        .update({
          pay_period_start: report.pay_period_start,
          pay_period_end: report.pay_period_end,
          number_of_pages: report.number_of_pages,
          status: submit ? "submitted" : report.status,
          submitted_at: submit ? new Date().toISOString() : report.submitted_at,
        })
        .eq("id", report.id);

      if (reportError) throw reportError;

      const filledItems = items
        .map((item, index) => ({ ...item, sort_order: index }))
        .filter(hasContent);

      const existingIds = filledItems.filter((i) => i.id).map((i) => i.id!);
      const toDelete = initialLineItems
        .filter((i) => !existingIds.includes(i.id))
        .map((i) => i.id);

      if (toDelete.length > 0) {
        await supabase.from("expense_line_items").delete().in("id", toDelete);
      }

      for (const item of filledItems) {
        const payload = {
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
        };

        if (item.id) {
          await supabase.from("expense_line_items").update(payload).eq("id", item.id);
        } else {
          await supabase.from("expense_line_items").insert(payload);
        }
      }

      setDirty(false);
      setMessage({
        type: "success",
        text: submit ? "Report submitted successfully!" : "Draft saved.",
      });

      if (submit) {
        setReport((r) => ({ ...r, status: "submitted", submitted_at: new Date().toISOString() }));
      }

      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save report",
      });
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  }

  function handleExport() {
    window.open(`/api/export?reportId=${report.id}`, "_blank");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-pdx-blue">Expense Report</h1>
          <p className="text-sm text-slate-500 mt-1">
            All expenses must have receipts attached to the report.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isEditable && (
            <>
              <Button variant="outline" onClick={() => saveReport(false)} loading={saving} disabled={!dirty && !saving}>
                <Save className="h-4 w-4" />
                Save Draft
              </Button>
              <Button onClick={() => saveReport(true)} loading={submitting}>
                <Send className="h-4 w-4" />
                Submit Report
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={cn(
            "p-3 rounded-lg text-sm flex items-center gap-2",
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          )}
        >
          {message.type === "error" && <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {!isEditable && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          This report is {report.status} and cannot be edited.
        </div>
      )}

      {isEditable && (
        <ReceiptUploadPanel
          reportId={report.id}
          disabled={!isEditable}
          onApply={applyReceiptItems}
        />
      )}

      {/* Report metadata */}
      <Card padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Employee Name
            </label>
            <p className="mt-1 font-medium">
              {profile.first_name} {profile.last_name}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Company
            </label>
            <p className="mt-1 font-medium">{profile.company}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Pay Period From
            </label>
            <input
              type="date"
              value={report.pay_period_start}
              onChange={(e) => {
                setReport((r) => ({ ...r, pay_period_start: e.target.value }));
                setDirty(true);
              }}
              disabled={!isEditable}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Pay Period To
            </label>
            <input
              type="date"
              value={report.pay_period_end}
              onChange={(e) => {
                setReport((r) => ({ ...r, pay_period_end: e.target.value }));
                setDirty(true);
              }}
              disabled={!isEditable}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>
        </div>
      </Card>

      {/* Expense table */}
      <Card padding="sm" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-xs border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-emerald-50 border border-slate-300 px-2 py-2 font-semibold text-slate-700 w-28">
                  Date
                </th>
                <th className="bg-emerald-50 border border-slate-300 px-2 py-2 font-semibold text-slate-700 min-w-[140px]">
                  Description
                </th>
                <th className="bg-related-to border border-slate-300 px-2 py-2 font-semibold text-slate-700 min-w-[100px]">
                  RELATED TO
                </th>
                {EXPENSE_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "border border-slate-300 px-1 py-2 font-semibold text-slate-700 text-center min-w-[80px]",
                      col.isMiles && "bg-miles",
                      col.computed && "bg-calc"
                    )}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="bg-calc border border-slate-300 px-2 py-2 font-semibold text-slate-700 min-w-[70px]">
                  Total
                </th>
                {isEditable && <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className={index % 2 === 1 ? "bg-amber-50/40" : "bg-white"}>
                  <td className="sticky left-0 z-10 border border-slate-200 p-0 bg-inherit">
                    <input
                      type="date"
                      value={item.expense_date ?? ""}
                      onChange={(e) => updateItem(index, "expense_date", e.target.value)}
                      disabled={!isEditable}
                      className="w-full px-2 py-1.5 text-xs bg-transparent border-0 focus:ring-1 focus:ring-pdx-blue rounded disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="border border-slate-200 p-0">
                    <div className="flex items-center">
                      {item.receipt_url && (
                        <span title="Receipt attached" className="pl-1 text-green-600 shrink-0">
                          <Receipt className="h-3 w-3" />
                        </span>
                      )}
                      <input
                        type="text"
                        value={item.description ?? ""}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        disabled={!isEditable}
                        placeholder="Expense description"
                        className="w-full px-2 py-1.5 text-xs bg-transparent border-0 focus:ring-1 focus:ring-pdx-blue rounded disabled:cursor-not-allowed"
                      />
                    </div>
                  </td>
                  <td className="border border-slate-200 p-0 bg-related-to/30">
                    <input
                      type="text"
                      value={item.related_to ?? ""}
                      onChange={(e) => updateItem(index, "related_to", e.target.value)}
                      disabled={!isEditable}
                      placeholder="Client/project"
                      className="w-full px-2 py-1.5 text-xs bg-transparent border-0 focus:ring-1 focus:ring-pdx-blue rounded disabled:cursor-not-allowed"
                    />
                  </td>
                  {EXPENSE_COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "border border-slate-200 p-0",
                        col.isMiles && "bg-miles/30",
                        col.computed && "bg-calc/50"
                      )}
                    >
                      {col.computed ? (
                        <div className="px-2 py-1.5 text-xs text-right font-medium text-slate-600">
                          {item.mileage_calc > 0 ? formatCurrency(item.mileage_calc) : "—"}
                        </div>
                      ) : (
                        <input
                          type="number"
                          step={col.isMiles ? "0.1" : "0.01"}
                          min="0"
                          value={
                            col.isMiles
                              ? item.miles || ""
                              : (item[col.key as keyof LineItemDraft] as number) || ""
                          }
                          onChange={(e) => updateItem(index, col.key, e.target.value)}
                          disabled={!isEditable}
                          placeholder={col.isMiles ? "0" : "$0"}
                          className="w-full px-2 py-1.5 text-xs text-right bg-transparent border-0 focus:ring-1 focus:ring-pdx-blue rounded disabled:cursor-not-allowed"
                        />
                      )}
                    </td>
                  ))}
                  <td className="border border-slate-200 px-2 py-1.5 text-xs text-right font-semibold bg-calc/50">
                    {item.row_total > 0 ? formatCurrency(item.row_total) : "—"}
                  </td>
                  {isEditable && (
                    <td className="p-0">
                      {hasContent(item) && (
                        <button
                          onClick={() => removeRow(index)}
                          className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                          title="Remove row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-calc font-bold">
                <td colSpan={3} className="border border-slate-300 px-2 py-2 text-right text-xs">
                  TOTALS
                </td>
                <td className="border border-slate-300 px-2 py-2 text-xs text-right">
                  {formatCurrency(totals.travel_lodging)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-xs text-right">
                  {formatCurrency(totals.tolls_parking)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-xs text-right">
                  {totals.miles.toFixed(1)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-xs text-right">
                  {formatCurrency(totals.mileage_calc)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-xs text-right">
                  {formatCurrency(totals.office_supplies)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-xs text-right">
                  {formatCurrency(totals.meals_entertainment)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-xs text-right">
                  {formatCurrency(totals.vehicle_maintenance)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-xs text-right">
                  {formatCurrency(totals.marketing)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-xs text-right">
                  {formatCurrency(totals.misc)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-xs text-right text-pdx-blue">
                  {formatCurrency(totals.grand_total)}
                </td>
                {isEditable && <td />}
              </tr>
            </tbody>
          </table>
        </div>

        {isEditable && (
          <div className="p-3 border-t border-slate-200">
            <Button variant="ghost" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4" />
              Add Row
            </Button>
          </div>
        )}
      </Card>

      {/* Footer summary */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="text-sm text-slate-500">
          <p className="font-medium text-slate-700">APPROVED:</p>
          <div className="mt-4 space-y-6">
            <div className="border-b border-slate-300 w-48" />
            <div className="border-b border-slate-300 w-48" />
          </div>
        </div>
        <div className="space-y-2 text-right">
          <div className="flex items-center justify-end gap-4">
            <span className="text-sm font-medium text-slate-600">Subtotal:</span>
            <span className="bg-miles/50 px-4 py-2 rounded font-semibold min-w-[120px]">
              {formatCurrency(totals.grand_total)}
            </span>
          </div>
          <div className="flex items-center justify-end gap-4">
            <span className="text-sm font-bold text-slate-700">Total:</span>
            <span className="bg-miles/50 px-4 py-2 rounded font-bold text-lg text-pdx-blue min-w-[120px]">
              {formatCurrency(totals.grand_total)}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Mileage rate: ${mileageRate.toFixed(2)}/mile · IRS standard rate
          </p>
        </div>
      </div>
    </div>
  );
}

function hasContent(item: LineItemDraft): boolean {
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

function sum(items: LineItemDraft[], key: keyof LineItemDraft): number {
  return items.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
}
