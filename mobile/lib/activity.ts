import { supabase } from "./supabase";

export type ExpenseReminder = {
  id: string;
  merchant: string;
  amount: number;
  expense_date: string | null;
  note: string | null;
  status: "pending" | "notified" | "submitted" | "dismissed" | "no_receipt" | string;
  created_at: string;
  notified_at: string | null;
};

export async function fetchExpenseReminders(userId: string): Promise<ExpenseReminder[]> {
  const { data, error } = await supabase
    .from("expense_reminders")
    .select("id, merchant, amount, expense_date, note, status, created_at, notified_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as ExpenseReminder[];
}

export function getReminderStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending review";
    case "notified":
      return "Action needed";
    case "submitted":
      return "Submitted";
    case "no_receipt":
      return "No receipt on file";
    case "dismissed":
      return "Dismissed";
    default:
      return status;
  }
}
