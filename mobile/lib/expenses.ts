import { endOfWeek, format, startOfWeek } from "date-fns";
import { supabase } from "./supabase";
import type { ExpenseLineItem, ExpenseReport } from "./types";
import { calculateRowTotal } from "./types";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  getCategoryFromAmounts,
  type ExpenseCategoryKey,
} from "./categories";
import { toIsoDate } from "./utils";

export type ExpenseCategory = ExpenseCategoryKey;

export { EXPENSE_CATEGORIES };

export type ExpenseEntry = ExpenseLineItem & {
  report_status?: ExpenseReport["status"];
  pay_period_start?: string;
};

export function getCategoryFromItem(item: ExpenseLineItem): ExpenseCategory {
  return getCategoryFromAmounts(item as Record<string, number | undefined>);
}

export function getCategoryLabel(item: ExpenseLineItem): string {
  return EXPENSE_CATEGORY_LABELS[getCategoryFromItem(item)];
}

export function filterExpenses(
  items: ExpenseEntry[],
  query: string,
  category: ExpenseCategory | "all"
): ExpenseEntry[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (category !== "all" && getCategoryFromItem(item) !== category) return false;
    if (!q) return true;
    const haystack = [
      item.description,
      item.related_to,
      item.company,
      getCategoryLabel(item),
      item.expense_date,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export async function getOrCreateDraftReport(userId: string): Promise<ExpenseReport> {
  const today = new Date();
  const start = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const end = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: existingRows, error: fetchError } = await supabase
    .from("expense_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "draft")
    .eq("pay_period_start", start)
    .order("created_at", { ascending: false })
    .limit(1);

  if (fetchError) throw fetchError;
  if (existingRows?.[0]) return existingRows[0] as ExpenseReport;

  const { data, error } = await supabase
    .from("expense_reports")
    .insert({ user_id: userId, pay_period_start: start, pay_period_end: end, status: "draft" })
    .select()
    .single();

  if (error) throw error;
  return data as ExpenseReport;
}

export async function fetchRecentExpenses(userId: string, limit = 200): Promise<ExpenseEntry[]> {
  const { data: reports } = await supabase
    .from("expense_reports")
    .select("id, status, pay_period_start")
    .eq("user_id", userId);

  if (!reports?.length) return [];

  const reportMap = new Map(reports.map((r) => [r.id, r]));

  const { data: items, error } = await supabase
    .from("expense_line_items")
    .select("*")
    .in(
      "report_id",
      reports.map((r) => r.id)
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((items as ExpenseLineItem[]) ?? []).map((item) => {
    const report = reportMap.get(item.report_id!);
    return {
      ...item,
      report_status: report?.status,
      pay_period_start: report?.pay_period_start,
    };
  });
};

export type SubmitExpenseInput = {
  amount: number;
  category: ExpenseCategory;
  description: string;
  expenseDate: string;
  relatedTo?: string;
  receiptUrl?: string | null;
  company?: string;
  miles?: number;
  mileageRate?: number;
};

export type SubmitLineItemsInput = {
  items: ExpenseLineItem[];
  company: string;
  expenseDate: string;
  receiptUrl?: string | null;
};

function lineItemToPayload(
  reportId: string,
  item: ExpenseLineItem,
  sortOrder: number,
  company: string,
  expenseDate: string,
  receiptUrl: string | null
): Record<string, unknown> {
  return {
    report_id: reportId,
    sort_order: sortOrder,
    expense_date: toIsoDate(item.expense_date) ?? toIsoDate(expenseDate) ?? format(new Date(), "yyyy-MM-dd"),
    description: item.description?.trim() || "Expense",
    related_to: item.related_to?.trim() || null,
    company: company || null,
    travel_lodging: item.travel_lodging || 0,
    tolls_parking: item.tolls_parking || 0,
    miles: item.miles || 0,
    mileage_calc: item.mileage_calc || 0,
    office_supplies: item.office_supplies || 0,
    meals_entertainment: item.meals_entertainment || 0,
    vehicle_maintenance: item.vehicle_maintenance || 0,
    marketing: item.marketing || 0,
    misc: item.misc || 0,
    row_total: item.row_total || calculateRowTotal(item),
    receipt_url: item.receipt_url ?? (sortOrder === 0 ? receiptUrl : null),
  };
}

export async function submitLineItems(userId: string, input: SubmitLineItemsInput): Promise<ExpenseLineItem[]> {
  const report = await getOrCreateDraftReport(userId);

  const { count } = await supabase
    .from("expense_line_items")
    .select("*", { count: "exact", head: true })
    .eq("report_id", report.id);

  let sortOrder = count ?? 0;
  const payloads = input.items.map((item) =>
    lineItemToPayload(report.id, item, sortOrder++, input.company, input.expenseDate, input.receiptUrl ?? null)
  );

  const { data, error } = await supabase.from("expense_line_items").insert(payloads).select();
  if (error) throw error;
  return (data as ExpenseLineItem[]) ?? [];
}

export async function submitExpense(userId: string, input: SubmitExpenseInput): Promise<ExpenseLineItem> {
  const report = await getOrCreateDraftReport(userId);
  const expenseDate = toIsoDate(input.expenseDate) ?? format(new Date(), "yyyy-MM-dd");
  const amount = Math.round(input.amount * 100) / 100;
  const miles = input.miles ?? 0;
  const mileageRate = input.mileageRate ?? 0.67;
  const mileageCalc = miles > 0 ? Math.round(miles * mileageRate * 100) / 100 : 0;
  const rowTotal = amount + mileageCalc;

  const { count } = await supabase
    .from("expense_line_items")
    .select("*", { count: "exact", head: true })
    .eq("report_id", report.id);

  const payload: Record<string, unknown> = {
    report_id: report.id,
    sort_order: count ?? 0,
    expense_date: expenseDate,
    description: input.description.trim() || "Expense",
    related_to: input.relatedTo?.trim() || null,
    company: input.company?.trim() || null,
    travel_lodging: 0,
    tolls_parking: 0,
    miles,
    mileage_calc: mileageCalc,
    office_supplies: 0,
    meals_entertainment: 0,
    vehicle_maintenance: 0,
    marketing: 0,
    misc: 0,
    row_total: rowTotal,
    receipt_url: input.receiptUrl ?? null,
  };

  payload[input.category] = amount;

  const { data, error } = await supabase.from("expense_line_items").insert(payload).select().single();
  if (error) throw error;
  return data as ExpenseLineItem;
}

export async function submitReportForApproval(reportId: string): Promise<void> {
  const { error } = await supabase
    .from("expense_reports")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", reportId)
    .eq("status", "draft");
  if (error) throw error;
}

export async function submitDraftReports(reportIds: string[]): Promise<void> {
  const unique = [...new Set(reportIds)];
  for (const id of unique) {
    await submitReportForApproval(id);
  }
}

export function getPendingReportIds(expenses: ExpenseEntry[]): string[] {
  return [
    ...new Set(
      expenses
        .filter((e) => e.report_status === "draft" && e.report_id)
        .map((e) => e.report_id as string)
    ),
  ];
}
