import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";

type PushPayload = {
  to: string;
  title: string;
  body: string;
  sound?: "default";
  priority?: "default" | "normal" | "high";
  data?: Record<string, unknown>;
};

type ExpoTicket = { status?: string; id?: string; message?: string };
type ExpoReceipt = { status?: string; message?: string; details?: { error?: string } };

type RequestBody = {
  action: "test" | "missing_expense" | "missing_expense_service";
  userId?: string;
  merchant?: string;
  amount?: number;
  expenseDate?: string;
  note?: string;
  reminderId?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

async function sendExpoPush(messages: PushPayload[]) {
  if (messages.length === 0) return { ok: true, tickets: [] as unknown[] };

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  const raw = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      raw.trimStart().startsWith("<?xml")
        ? "Expo push service returned an unexpected response. Check push credentials in EAS."
        : "Expo push service returned invalid JSON."
    );
  }

  if (!res.ok) {
    const detail =
      typeof body?.errors === "object" &&
      Array.isArray(body.errors) &&
      typeof body.errors[0]?.message === "string"
        ? body.errors[0].message
        : typeof body?.message === "string"
          ? body.message
          : "Expo push failed";
    throw new Error(detail);
  }

  const tickets = Array.isArray(body?.data) ? body.data : body?.data ? [body.data] : [];
  const ticketError = tickets.find(
    (ticket: { status?: string; message?: string }) => ticket?.status === "error"
  );
  if (ticketError?.message) {
    throw new Error(ticketError.message);
  }

  return body;
}

async function fetchPushReceipts(ticketIds: string[]): Promise<Record<string, ExpoReceipt>> {
  if (ticketIds.length === 0) return {};

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const res = await fetch(EXPO_RECEIPTS_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids: ticketIds }),
  });

  const raw = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }

  const data = body?.data;
  return data && typeof data === "object" ? (data as Record<string, ExpoReceipt>) : {};
}

function summarizeReceipts(receipts: Record<string, ExpoReceipt>) {
  const entries = Object.values(receipts);
  if (entries.length === 0) {
    return { status: "pending" as const, message: "Delivery status pending. Check Notification Center." };
  }

  const errorReceipt = entries.find((receipt) => receipt?.status === "error");
  if (errorReceipt) {
    const code = errorReceipt.details?.error;
    const message =
      code === "DeviceNotRegistered"
        ? "This device token is stale. Turn push off and on in Profile, then try again."
        : errorReceipt.message ?? code ?? "Push delivery failed.";
    return { status: "error" as const, message, code };
  }

  return { status: "ok" as const, message: "Apple accepted the notification." };
}

async function deliverMissingExpensePush(
  admin: ReturnType<typeof createClient>,
  body: RequestBody,
  createdBy?: string | null
) {
  const targetUserId = body.userId;
  const merchant = body.merchant?.trim();
  const amount = Number(body.amount);

  if (!targetUserId || !merchant || !Number.isFinite(amount) || amount <= 0) {
    return json({ error: "userId, merchant, and amount are required" }, 400);
  }

  let reminderId = body.reminderId;

  if (!reminderId) {
    const { data: reminder, error: insertError } = await admin
      .from("expense_reminders")
      .insert({
        user_id: targetUserId,
        created_by: createdBy ?? null,
        merchant,
        amount,
        expense_date: body.expenseDate ?? null,
        note: body.note ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) throw new Error(insertError.message);
    reminderId = reminder.id;
  }

  const { data: tokens } = await admin
    .from("user_push_tokens")
    .select("expo_push_token")
    .eq("user_id", targetUserId)
    .eq("enabled", true);

  const pushTokens = (tokens ?? []).map((t) => t.expo_push_token).filter(Boolean);

  const defaultNote =
    `Charge on your card: ${formatMoney(amount)} at ${merchant.slice(0, 80)}. ` +
    "Open PDX Expense to upload a receipt or explain this charge.";
  const pushBody = body.note?.trim() ? body.note.trim() : defaultNote;

  let sent = 0;
  let pushWarning: string | null = null;

  if (pushTokens.length === 0) {
    pushWarning = "Reminder saved but employee has no push token — they will see it in the app Notifications tab.";
  } else {
    const result = await sendExpoPush(
      pushTokens.map((token) => ({
        to: token,
        title: "Missing expense on card",
        body: pushBody,
        sound: "default",
        priority: "high",
        data: {
          type: "missing_expense",
          route: "/(app)/submit",
          reminderId,
          merchant,
          amount: String(amount),
          expenseDate: body.expenseDate ?? "",
          note: body.note ?? "",
        },
      }))
    );
    sent = pushTokens.length;

    const tickets = Array.isArray(result?.data) ? (result.data as ExpoTicket[]) : [];
    const ticketIds = tickets.map((ticket) => ticket.id).filter((id): id is string => Boolean(id));
    const receipts = await fetchPushReceipts(ticketIds);
    const delivery = summarizeReceipts(receipts);
    if (delivery.status === "error") {
      pushWarning = delivery.message ?? "Push delivery failed";
    }
  }

  await admin
    .from("expense_reminders")
    .update({
      status: sent > 0 && !pushWarning ? "notified" : "pending",
      notified_at: sent > 0 && !pushWarning ? new Date().toISOString() : null,
    })
    .eq("id", reminderId);

  return json({
    success: true,
    sent,
    reminderId,
    pushWarning,
  });
}

async function isAdmin(admin: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data: profile } = await admin
    .from("profiles")
    .select("role, email")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return false;
  if (profile.role === "regional_manager") return true;

  const adminEmails = (Deno.env.get("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const email = (profile.email ?? "").toLowerCase();
  return adminEmails.length > 0 && adminEmails.includes(email);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = (await req.json()) as RequestBody;
    const action = body.action;
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (action === "missing_expense_service") {
      if (!serviceKey || token !== serviceKey) {
        return json({ error: "Service role required" }, 403);
      }
      return deliverMissingExpensePush(admin, body, null);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);

    if (action === "test") {
      const { data: tokens } = await admin
        .from("user_push_tokens")
        .select("expo_push_token")
        .eq("user_id", user.id)
        .eq("enabled", true);

      const pushTokens = (tokens ?? []).map((t) => t.expo_push_token).filter(Boolean);
      if (pushTokens.length === 0) {
        return json({ error: "No push tokens registered for this account. Enable push in Profile." }, 400);
      }

      const result = await sendExpoPush(
        pushTokens.map((token) => ({
          to: token,
          title: "PDX Expense",
          body: "Push notifications are working.",
          sound: "default",
          priority: "high",
          data: {
            type: "test",
            route: "/(app)/(tabs)/dashboard",
          },
        }))
      );

      const tickets = Array.isArray(result?.data) ? (result.data as ExpoTicket[]) : [];
      const ticketIds = tickets.map((ticket) => ticket.id).filter((id): id is string => Boolean(id));
      const receipts = await fetchPushReceipts(ticketIds);
      const delivery = summarizeReceipts(receipts);

      if (delivery.status === "error") {
        return json({ error: delivery.message, sent: pushTokens.length, delivery, receipts }, 400);
      }

      return json({ success: true, sent: pushTokens.length, delivery, result });
    }

    if (action === "missing_expense") {
      const callerIsAdmin = await isAdmin(admin, user.id);
      if (!callerIsAdmin) return json({ error: "Admin access required" }, 403);
      return deliverMissingExpensePush(admin, body, user.id);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Push send failed";
    return json({ error: message }, 500);
  }
});
