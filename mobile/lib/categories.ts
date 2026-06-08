/** Matches PDX T&E expense report spreadsheet columns (amount categories) */
export const EXPENSE_CATEGORIES = [
  { key: "travel_lodging", label: "TRV / LOD", shortLabel: "Travel", emoji: "✈️" },
  { key: "tolls_parking", label: "Toll/Parking", shortLabel: "Tolls", emoji: "🅿️" },
  { key: "office_supplies", label: "OFF. SUP & EQP", shortLabel: "Office", emoji: "📎" },
  { key: "meals_entertainment", label: "Meals & Enter.", shortLabel: "Meals", emoji: "🍽️" },
  { key: "vehicle_maintenance", label: "Cell & / M", shortLabel: "Cell", emoji: "📱" },
  { key: "marketing", label: "Marketing", shortLabel: "Marketing", emoji: "📣" },
  { key: "misc", label: "Misc.", shortLabel: "Misc", emoji: "📋" },
] as const;

export type ExpenseCategoryKey = (typeof EXPENSE_CATEGORIES)[number]["key"];

export const EXPENSE_CATEGORY_KEYS = EXPENSE_CATEGORIES.map((c) => c.key);

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategoryKey, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.key, c.label])
) as Record<ExpenseCategoryKey, string>;

export const EXPENSE_CATEGORY_SHORT: Record<ExpenseCategoryKey, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.key, c.shortLabel])
) as Record<ExpenseCategoryKey, string>;

/** For OpenAI — must pick exactly one of these keys per line item */
export const AI_CATEGORY_PROMPT = EXPENSE_CATEGORIES.map((c) => `- ${c.key}: ${c.label}`).join("\n");

export function normalizeCategory(value: string | undefined | null): ExpenseCategoryKey {
  if (!value) return "misc";
  const v = value.toLowerCase().trim();
  if (EXPENSE_CATEGORY_KEYS.includes(v as ExpenseCategoryKey)) return v as ExpenseCategoryKey;
  // fuzzy fallbacks
  if (v.includes("travel") || v.includes("lodg") || v.includes("hotel")) return "travel_lodging";
  if (v.includes("toll") || v.includes("parking")) return "tolls_parking";
  if (v.includes("office") || v.includes("suppl")) return "office_supplies";
  if (v.includes("meal") || v.includes("entertain") || v.includes("food") || v.includes("restaurant")) return "meals_entertainment";
  if (v.includes("cell") || v.includes("phone") || v.includes("mobile")) return "vehicle_maintenance";
  if (v.includes("market")) return "marketing";
  return "misc";
}

export function getCategoryFromAmounts(item: Record<string, number | undefined>): ExpenseCategoryKey {
  for (const { key } of EXPENSE_CATEGORIES) {
    if ((item[key] ?? 0) > 0) return key;
  }
  if ((item.mileage_calc ?? 0) > 0) return "travel_lodging";
  return "misc";
}
