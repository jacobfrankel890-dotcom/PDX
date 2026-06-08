export const RECEIPT_CATEGORIES = [
  "travel_lodging",
  "tolls_parking",
  "office_supplies",
  "meals_entertainment",
  "vehicle_maintenance",
  "marketing",
  "misc",
] as const;

export type ReceiptCategory = (typeof RECEIPT_CATEGORIES)[number];

export const RECEIPT_CATEGORY_LABELS: Record<ReceiptCategory, string> = {
  travel_lodging: "Travel & Lodging",
  tolls_parking: "Tolls / Parking",
  office_supplies: "Office Supplies",
  meals_entertainment: "Meals & Entertainment",
  vehicle_maintenance: "Vehicle Maintenance",
  marketing: "Marketing",
  misc: "Miscellaneous",
};

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

export function analysisToLineItems(
  analysis: ReceiptAnalysisResult,
  receiptUrl: string | null
): import("./types").ExpenseLineItem[] {
  const items =
    analysis.line_items.length > 0
      ? analysis.line_items
      : [{ description: analysis.description, amount: analysis.total_amount, category: analysis.primary_category }];

  return items.map((item, index) => {
    const row = createEmptyLineItem(index);
    row.expense_date = analysis.expense_date;
    row.description =
      items.length > 1
        ? `${analysis.merchant_name} — ${item.description}`
        : `${analysis.merchant_name}${analysis.description ? ` — ${analysis.description}` : ""}`;
    row.related_to = analysis.related_to || null;
    row[item.category] = Math.round(item.amount * 100) / 100;
    row.row_total = Math.round(item.amount * 100) / 100;
    row.receipt_url = index === 0 ? receiptUrl : null;
    return row;
  });
}

function createEmptyLineItem(sortOrder: number): import("./types").ExpenseLineItem {
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
