import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

async function readFunctionError(error: unknown): Promise<string | null> {
  if (!(error instanceof FunctionsHttpError)) return null;
  try {
    const raw = await error.context.text();
    if (!raw) return null;
    try {
      const context = JSON.parse(raw) as { error?: unknown };
      if (context?.error) return String(context.error);
    } catch {
      if (raw.trimStart().startsWith("<?xml") || raw.trimStart().startsWith("<")) {
        return "Push service returned an unexpected response. Try again in a moment.";
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const detail = await readFunctionError(error);
    throw new Error(detail ?? error.message);
  }
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
  return data as T;
}

export type PushDeliveryStatus = {
  status: "ok" | "pending" | "error";
  message?: string;
  code?: string;
};

export async function sendTestPushNotification(): Promise<{ sent: number; delivery?: PushDeliveryStatus }> {
  const data = await invoke<{ success: boolean; sent: number; delivery?: PushDeliveryStatus }>("send-push", {
    action: "test",
  });
  return { sent: data.sent, delivery: data.delivery };
}

export type MissingExpensePushInput = {
  userId: string;
  merchant: string;
  amount: number;
  expenseDate?: string;
  note?: string;
  reminderId?: string;
};

export async function sendMissingExpensePush(input: MissingExpensePushInput): Promise<{ reminderId: string; sent: number }> {
  const data = await invoke<{ success: boolean; reminderId: string; sent: number }>("send-push", {
    action: "missing_expense",
    ...input,
  });
  return { reminderId: data.reminderId, sent: data.sent };
}

export async function markExpenseReminderSubmitted(reminderId: string): Promise<void> {
  const { error } = await supabase
    .from("expense_reminders")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", reminderId);
  if (error) throw error;
}

/** Link expense to flagged charge — auto-confirms when a receipt was uploaded. */
export async function resolveExpenseReminder(
  reminderId: string,
  lineItemId: string,
  hasReceipt: boolean
): Promise<void> {
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    expense_line_item_id: lineItemId,
    submitted_at: now,
  };
  if (hasReceipt) {
    payload.status = "confirmed";
    payload.confirmed_at = now;
    payload.resolution = "receipt";
  } else {
    payload.status = "submitted";
    payload.resolution = "manual";
  }
  const { error } = await supabase.from("expense_reminders").update(payload).eq("id", reminderId);
  if (error) throw error;
}

export async function markExpenseReminderNoReceipt(reminderId: string, note?: string): Promise<void> {
  const { error } = await supabase
    .from("expense_reminders")
    .update({
      status: "no_receipt",
      note: note ?? "Employee confirmed receipt unavailable",
    })
    .eq("id", reminderId);
  if (error) throw error;
}
