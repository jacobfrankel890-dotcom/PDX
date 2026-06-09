import type { ExpenseEntry } from "./expenses";
import { filterExpenses, type ExpenseCategory } from "./expenses";

export type ExpenseSortKey = "newest" | "oldest" | "amount_desc" | "amount_asc";
export type ExpenseStatusFilter = "all" | "pending" | "submitted";

export const EXPENSE_SORT_OPTIONS: { key: ExpenseSortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "amount_desc", label: "Amount ↓" },
  { key: "amount_asc", label: "Amount ↑" },
];

export const EXPENSE_STATUS_FILTERS: { key: ExpenseStatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "submitted", label: "Submitted" },
];

function sortExpenses(items: ExpenseEntry[], sort: ExpenseSortKey): ExpenseEntry[] {
  const copy = [...items];
  copy.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return String(a.created_at ?? a.expense_date ?? "").localeCompare(
          String(b.created_at ?? b.expense_date ?? "")
        );
      case "amount_desc":
        return (b.row_total ?? 0) - (a.row_total ?? 0);
      case "amount_asc":
        return (a.row_total ?? 0) - (b.row_total ?? 0);
      case "newest":
      default:
        return String(b.created_at ?? b.expense_date ?? "").localeCompare(
          String(a.created_at ?? a.expense_date ?? "")
        );
    }
  });
  return copy;
}

export function applyExpenseFilters(
  items: ExpenseEntry[],
  opts: {
    query: string;
    category: ExpenseCategory | "all";
    status: ExpenseStatusFilter;
    sort: ExpenseSortKey;
  }
): ExpenseEntry[] {
  let result = filterExpenses(items, opts.query, opts.category);

  if (opts.status === "pending") {
    result = result.filter((item) => item.report_status === "draft");
  } else if (opts.status === "submitted") {
    result = result.filter((item) => item.report_status === "submitted");
  }

  return sortExpenses(result, opts.sort);
}

export function countActiveExpenseFilters(opts: {
  query: string;
  category: ExpenseCategory | "all";
  status: ExpenseStatusFilter;
  sort: ExpenseSortKey;
}): number {
  let count = 0;
  if (opts.query.trim()) count += 1;
  if (opts.category !== "all") count += 1;
  if (opts.status !== "all") count += 1;
  if (opts.sort !== "newest") count += 1;
  return count;
}
