export const REGIONS = [
  { value: "cpx", label: "CPX", description: "Canada" },
  { value: "pdx_north", label: "PDX North", description: "Northeast US" },
  { value: "apx", label: "APX", description: "All Parts Xpress" },
  { value: "pdx", label: "PDX", description: "Parts Distribution Xpress" },
  { value: "pdx_south", label: "PDX South", description: "Southeast US" },
  { value: "pdx_west", label: "PDX West", description: "Northwest US" },
  { value: "apx_california", label: "APX California", description: "Southwest US / California" },
] as const;

export const ROLES = [
  { value: "regional_manager", label: "Regional Manager" },
  { value: "kam", label: "Key Account Manager (KAM)" },
] as const;

export type PdxRegion = (typeof REGIONS)[number]["value"];
export type UserRole = (typeof ROLES)[number]["value"];
export type ReportStatus = "draft" | "submitted" | "approved" | "rejected";

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_verified: boolean;
  role: UserRole;
  region: PdxRegion;
  company: string;
}

export interface ExpenseReport {
  id: string;
  user_id: string;
  pay_period_start: string;
  pay_period_end: string;
  status: ReportStatus;
  grand_total: number;
  submitted_at: string | null;
  total_travel_lodging: number;
  total_tolls_parking: number;
  total_miles: number;
  total_mileage_calc: number;
  total_office_supplies: number;
  total_meals_entertainment: number;
  total_vehicle_maintenance: number;
  total_marketing: number;
  total_misc: number;
}

export interface ExpenseLineItem {
  id?: string;
  report_id?: string;
  sort_order: number;
  expense_date: string | null;
  description: string | null;
  related_to: string | null;
  travel_lodging: number;
  tolls_parking: number;
  miles: number;
  mileage_calc: number;
  office_supplies: number;
  meals_entertainment: number;
  vehicle_maintenance: number;
  marketing: number;
  misc: number;
  row_total: number;
  receipt_url: string | null;
}

export const EXPENSE_FIELDS = [
  { key: "travel_lodging" as const, label: "Travel & Lodging" },
  { key: "tolls_parking" as const, label: "Tolls / Parking" },
  { key: "office_supplies" as const, label: "Office Supplies" },
  { key: "meals_entertainment" as const, label: "Meals & Entertainment" },
  { key: "vehicle_maintenance" as const, label: "Vehicle Maintenance" },
  { key: "marketing" as const, label: "Marketing" },
  { key: "misc" as const, label: "Miscellaneous" },
];

export const DEFAULT_MILEAGE_RATE = 0.67;

export function createEmptyLineItem(sortOrder: number): ExpenseLineItem {
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

export function calculateRowTotal(item: Pick<ExpenseLineItem, "travel_lodging" | "tolls_parking" | "mileage_calc" | "office_supplies" | "meals_entertainment" | "vehicle_maintenance" | "marketing" | "misc">): number {
  return (
    Number(item.travel_lodging || 0) +
    Number(item.tolls_parking || 0) +
    Number(item.mileage_calc || 0) +
    Number(item.office_supplies || 0) +
    Number(item.meals_entertainment || 0) +
    Number(item.vehicle_maintenance || 0) +
    Number(item.marketing || 0) +
    Number(item.misc || 0)
  );
}

export function calculateMileage(miles: number, rate = DEFAULT_MILEAGE_RATE): number {
  return Math.round(miles * rate * 100) / 100;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function getRegionLabel(region: PdxRegion): string {
  return REGIONS.find((r) => r.value === region)?.label ?? region;
}

export function getRoleLabel(role: UserRole): string {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}
