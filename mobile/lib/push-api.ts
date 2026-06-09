import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

async function readFunctionError(error: unknown): Promise<string | null> {
  if (!(error instanceof FunctionsHttpError)) return null;
  try {
    const context = await error.context.json();
    if (context && typeof context === "object" && "error" in context && context.error) {
      return String(context.error);
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

export async function sendTestPushNotification(): Promise<{ sent: number }> {
  const data = await invoke<{ success: boolean; sent: number }>("send-push", { action: "test" });
  return { sent: data.sent };
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
