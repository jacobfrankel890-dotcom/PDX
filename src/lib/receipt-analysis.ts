import { z } from "zod";
import type { ExpenseColumnKey } from "./types";

/** Expense categories the AI can assign (excludes miles — not from receipts) */
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
  travel_lodging: "Travel & Lodging (TRV/LOD)",
  tolls_parking: "Tolls / Parking",
  office_supplies: "Office Supplies & Signage",
  meals_entertainment: "Meals & Entertainment",
  vehicle_maintenance: "Vehicle Maintenance / Repair",
  marketing: "Marketing",
  misc: "Miscellaneous",
};

export const receiptLineItemSchema = z.object({
  description: z.string(),
  amount: z.number().nonnegative(),
  category: z.enum(RECEIPT_CATEGORIES),
});

export const receiptAnalysisSchema = z.object({
  merchant_name: z.string(),
  expense_date: z.string().nullable(),
  description: z.string(),
  related_to: z.string(),
  total_amount: z.number().nonnegative(),
  primary_category: z.enum(RECEIPT_CATEGORIES),
  line_items: z.array(receiptLineItemSchema),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export type ReceiptAnalysisResult = z.infer<typeof receiptAnalysisSchema>;

export type AnalyzedReceipt = {
  id: string;
  fileName: string;
  previewUrl: string;
  storagePath: string;
  status: "analyzing" | "ready" | "error" | "applied";
  analysis?: ReceiptAnalysisResult;
  error?: string;
};

export function buildReceiptAnalysisPrompt(context: {
  userRegion: string;
  userRole: string;
  payPeriodStart: string;
  payPeriodEnd: string;
}): string {
  return `You are an expense report assistant for Parts Distribution Xpress (PDX), an automotive parts distribution company.

Analyze this receipt image and extract structured expense data for a T&E (Travel & Entertainment) expense report.

USER CONTEXT:
- Region: ${context.userRegion}
- Role: ${context.userRole}
- Pay period: ${context.payPeriodStart} to ${context.payPeriodEnd}

CATEGORY DEFINITIONS (use exactly these keys):
- travel_lodging: Hotels, flights, rental cars, lodging
- tolls_parking: Highway tolls, parking garages, parking meters
- office_supplies: Office supplies, signage, printing, stationery
- meals_entertainment: Restaurants, meals, client entertainment, coffee shops
- vehicle_maintenance: Auto repair, oil changes, tires, car wash for company vehicle
- marketing: Promotional materials, trade show costs, advertising
- misc: Anything that doesn't fit above categories

RELATED TO field: Identify the client, account, dealership, job site, or business purpose this expense relates to. If unclear, suggest the most likely based on merchant name and region (${context.userRegion}). Examples: "ABC Motors - Detroit", "Client visit - Johnson Auto", "Regional travel - PDX North".

INSTRUCTIONS:
1. Read all visible text on the receipt (merchant, date, line items, totals, tax)
2. Determine the expense date in YYYY-MM-DD format (use receipt date; if missing use null)
3. Itemize individual purchasable line items when visible; assign each a category and amount
4. If only a total is visible with no itemization, return one line_item matching the total
5. Set primary_category to the category with the largest dollar amount
6. total_amount must equal the receipt grand total (including tax if shown)
7. Line item amounts should sum to total_amount (within $0.02 rounding tolerance)
8. confidence: 0.0-1.0 how confident you are in the extraction accuracy
9. notes: brief explanation of any ambiguity or assumptions

Respond ONLY with valid JSON matching this schema:
{
  "merchant_name": "string",
  "expense_date": "YYYY-MM-DD or null",
  "description": "brief summary for expense report",
  "related_to": "client/account/business purpose",
  "total_amount": number,
  "primary_category": "category_key",
  "line_items": [
    { "description": "string", "amount": number, "category": "category_key" }
  ],
  "confidence": number,
  "notes": "optional string"
}`;
}

export function parseReceiptAnalysis(raw: string): ReceiptAnalysisResult {
  const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return receiptAnalysisSchema.parse(parsed);
}

/** Convert AI analysis into expense report row drafts */
export function analysisToLineItemDrafts(
  analysis: ReceiptAnalysisResult,
  receiptUrl: string | null
): Array<{
  expense_date: string | null;
  description: string | null;
  related_to: string | null;
  travel_lodging: number;
  tolls_parking: number;
  office_supplies: number;
  meals_entertainment: number;
  vehicle_maintenance: number;
  marketing: number;
  misc: number;
  row_total: number;
  receipt_url: string | null;
}> {
  const items =
    analysis.line_items.length > 0
      ? analysis.line_items
      : [
          {
            description: analysis.description,
            amount: analysis.total_amount,
            category: analysis.primary_category,
          },
        ];

  return items.map((item, index) => {
    const row = {
      expense_date: analysis.expense_date,
      description:
        items.length > 1
          ? `${analysis.merchant_name} — ${item.description}`
          : analysis.merchant_name
            ? `${analysis.merchant_name}${analysis.description ? ` — ${analysis.description}` : ""}`
            : analysis.description,
      related_to: analysis.related_to || null,
      travel_lodging: 0,
      tolls_parking: 0,
      office_supplies: 0,
      meals_entertainment: 0,
      vehicle_maintenance: 0,
      marketing: 0,
      misc: 0,
      row_total: 0,
      receipt_url: index === 0 ? receiptUrl : null,
    };

    const cat = item.category as ReceiptCategory;
    if (RECEIPT_CATEGORIES.includes(cat)) {
      row[cat] = Math.round(item.amount * 100) / 100;
    }
    row.row_total = Math.round(item.amount * 100) / 100;

    return row;
  });
}

export function isReceiptCategory(key: string): key is ReceiptCategory {
  return RECEIPT_CATEGORIES.includes(key as ReceiptCategory);
}

export function categoryToColumnKey(category: ReceiptCategory): ExpenseColumnKey {
  return category;
}
