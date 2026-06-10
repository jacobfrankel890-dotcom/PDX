import { format, parseISO } from "date-fns";
import { supabase } from "./supabase";
import { fetchExpenseReminders, type ExpenseReminder } from "./activity";
import { formatCurrency } from "./types";

export type NotificationKind =
  | "missing_expense"
  | "report_submitted"
  | "report_approved"
  | "report_rejected";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  unread: boolean;
  reminderId?: string;
  reportId?: string;
  merchant?: string;
  amount?: number;
  expenseDate?: string | null;
};

type ExpenseReportRow = {
  id: string;
  status: string;
  grand_total: number;
  pay_period_start: string;
  pay_period_end: string;
  submitted_at: string | null;
  approved_at: string | null;
  updated_at: string;
};

function periodLabel(start: string, end: string): string {
  try {
    const s = format(parseISO(start), "MMM d");
    const e = format(parseISO(end), "MMM d");
    return `${s} – ${e}`;
  } catch {
    return `${start} – ${end}`;
  }
}

function reminderNotification(reminder: ExpenseReminder): AppNotification {
  const actionable = reminder.status === "notified" || reminder.status === "pending";
  return {
    id: `reminder-${reminder.id}`,
    kind: "missing_expense",
    title: "Missing receipt",
    body: `${reminder.merchant} · ${formatCurrency(Number(reminder.amount))}${
      reminder.note ? ` — ${reminder.note}` : ""
    }`,
    createdAt: reminder.notified_at ?? reminder.created_at,
    unread: actionable,
    reminderId: reminder.id,
    merchant: reminder.merchant,
    amount: Number(reminder.amount),
    expenseDate: reminder.expense_date,
  };
}

function reportNotification(report: ExpenseReportRow): AppNotification | null {
  const period = periodLabel(report.pay_period_start, report.pay_period_end);
  const total = formatCurrency(Number(report.grand_total ?? 0));

  if (report.status === "submitted" && report.submitted_at) {
    return {
      id: `report-submitted-${report.id}`,
      kind: "report_submitted",
      title: "Report submitted",
      body: `${period} · ${total} sent for approval`,
      createdAt: report.submitted_at,
      unread: false,
      reportId: report.id,
    };
  }

  if (report.status === "approved" && report.approved_at) {
    return {
      id: `report-approved-${report.id}`,
      kind: "report_approved",
      title: "Report approved",
      body: `${period} · ${total} was approved`,
      createdAt: report.approved_at,
      unread: false,
      reportId: report.id,
    };
  }

  if (report.status === "rejected") {
    return {
      id: `report-rejected-${report.id}`,
      kind: "report_rejected",
      title: "Report needs changes",
      body: `${period} · ${total} was rejected — review and resubmit`,
      createdAt: report.updated_at,
      unread: true,
      reportId: report.id,
    };
  }

  return null;
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const [remindersResult, reportsResult] = await Promise.all([
    fetchExpenseReminders(userId).catch(() => [] as ExpenseReminder[]),
    supabase
      .from("expense_reports")
      .select(
        "id, status, grand_total, pay_period_start, pay_period_end, submitted_at, approved_at, updated_at"
      )
      .eq("user_id", userId)
      .in("status", ["submitted", "approved", "rejected"])
      .order("updated_at", { ascending: false })
      .limit(40),
  ]);

  const reminders = remindersResult
    .filter((r) => !["dismissed", "no_receipt", "submitted"].includes(r.status))
    .map(reminderNotification);
  const reports = (reportsResult.data ?? []) as ExpenseReportRow[];
  const reportNotes = reports
    .map(reportNotification)
    .filter((n): n is AppNotification => n !== null);

  return [...reminders, ...reportNotes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function countUnreadNotifications(items: AppNotification[]): number {
  return items.filter((n) => n.unread).length;
}

export async function dismissReminder(reminderId: string): Promise<void> {
  const { error } = await supabase
    .from("expense_reminders")
    .update({ status: "dismissed" })
    .eq("id", reminderId);
  if (error) throw error;
}
