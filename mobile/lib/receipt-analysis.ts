import type { ExpenseLineItem } from "./types";
import { normalizeCategory, type ExpenseCategoryKey } from "./categories";
import { toIsoDate } from "./utils";

export type ReceiptCategory = ExpenseCategoryKey;

export { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, normalizeCategory } from "./categories";
export type { ExpenseCategoryKey } from "./categories";

export interface ReceiptAnalysisResult {
  merchant_name: string;
  expense_date: string | null;
  description: string;
  related_to: string;
  total_amount: number;
  primary_category: ReceiptCategory;
  line_items: { description: string; amount: number; category: ReceiptCategory }[];
  confidence: number;
  notes?: string;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function toString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : value != null ? String(value) : fallback;
}

/** Sanitize raw AI JSON — prevents crashes from missing/malformed fields */
export function normalizeAnalysis(raw: unknown): ReceiptAnalysisResult {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const primary = normalizeCategory(toString(data.primary_category, "misc"));
  const lineItemsRaw = Array.isArray(data.line_items) ? data.line_items : [];

  const line_items = lineItemsRaw.map((entry) => {
    const item = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    return {
      description: toString(item.description, "Item"),
      amount: toNumber(item.amount),
      category: normalizeCategory(toString(item.category, primary)),
    };
  });

  return {
    merchant_name: toString(data.merchant_name, "Receipt"),
    expense_date: data.expense_date ? toString(data.expense_date) : null,
    description: toString(data.description, "Expense"),
    related_to: toString(data.related_to, ""),
    total_amount: toNumber(data.total_amount),
    primary_category: primary,
    line_items,
    confidence: Math.min(1, Math.max(0, toNumber(data.confidence, 0.8))),
    notes: data.notes ? toString(data.notes) : undefined,
  };
}

export function analysisToLineItems(
  analysisInput: ReceiptAnalysisResult | unknown,
  receiptUrl: string | null
): ExpenseLineItem[] {
  return [analysisToSingleLineItem(analysisInput, receiptUrl)];
}

/** One expense row per receipt — total in primary category, itemization kept for display only */
export function analysisToSingleLineItem(
  analysisInput: ReceiptAnalysisResult | unknown,
  receiptUrl: string | null
): ExpenseLineItem {
  const analysis = normalizeAnalysis(analysisInput);
  const primary = analysis.primary_category;
  const lineSum = analysis.line_items.reduce((s, i) => s + toNumber(i.amount), 0);
  const total = Math.round((analysis.total_amount || lineSum) * 100) / 100;

  const row = createEmptyLineItem(0);
  row.expense_date = toIsoDate(analysis.expense_date);
  row.description = analysis.merchant_name || analysis.description || "Receipt";
  row.related_to = analysis.related_to || null;
  row[primary] = total;
  row.row_total = total;
  row.receipt_url = receiptUrl;
  return row;
}

export function getAnalysisTotal(analysis: ReceiptAnalysisResult): number {
  const lineSum = analysis.line_items.reduce((s, i) => s + toNumber(i.amount), 0);
  return Math.round((analysis.total_amount || lineSum) * 100) / 100;
}

export function formatItemizationSummary(analysis: ReceiptAnalysisResult): string {
  if (analysis.line_items.length <= 1) return "";
  return analysis.line_items
    .map((item) => `${item.description} — $${toNumber(item.amount).toFixed(2)}`)
    .join("\n");
}

function createEmptyLineItem(sortOrder: number): ExpenseLineItem {
  return {
    sort_order: sortOrder,
    expense_date: null,
    description: null,
    related_to: null,
    travel_lodging: 0,
    tolls_parking: 0,
    miles: 0,
    mileage_calc: 0,
    office_supplies: 0,
    meals_entertainment: 0,
    vehicle_maintenance: 0,
    marketing: 0,
    misc: 0,
    row_total: 0,
    receipt_url: null,
  };
}
