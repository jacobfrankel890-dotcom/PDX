import { format, parseISO } from "date-fns";
import type { ExpenseEntry } from "./expenses";

export type ExpenseMonthSection = {
  title: string;
  sortKey: string;
  data: ExpenseEntry[];
};

export function groupExpensesByMonth(items: ExpenseEntry[]): ExpenseMonthSection[] {
  const groups = new Map<string, ExpenseMonthSection>();

  for (const item of items) {
    let title = "No date";
    let sortKey = "0000-00";

    if (item.expense_date) {
      try {
        const parsed = parseISO(item.expense_date);
        title = format(parsed, "MMMM yyyy");
        sortKey = format(parsed, "yyyy-MM");
      } catch {
        title = item.expense_date;
        sortKey = item.expense_date;
      }
    }

    const existing = groups.get(sortKey);
    if (existing) {
      existing.data.push(item);
    } else {
      groups.set(sortKey, { title, sortKey, data: [item] });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}

export function sumExpenseTotals(items: ExpenseEntry[]) {
  return items.reduce(
    (acc, item) => {
      const amount = item.row_total ?? 0;
      acc.total += amount;
      if (item.report_status === "draft") {
        acc.pending += amount;
        acc.pendingCount += 1;
      } else if (item.report_status === "submitted") {
        acc.submitted += amount;
        acc.submittedCount += 1;
      }
      return acc;
    },
    { total: 0, pending: 0, submitted: 0, pendingCount: 0, submittedCount: 0 }
  );
}
