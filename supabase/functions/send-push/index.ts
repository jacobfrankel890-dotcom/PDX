import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPO_PUSH_URL = "https://exp-api.expo.dev/v2/push/send";

type PushPayload = {
  to: string;
  title: string;
  body: string;
  sound?: "default";
  data?: Record<string, unknown>;
};

type RequestBody = {
  action: "test" | "missing_expense";
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
    body: JSON.stringify({ messages }),
  });

  const body = await res.json();
  if (!res.ok) {
    const detail =
      typeof body?.errors?.[0]?.message === "string"
        ? body.errors[0].message
        : typeof body?.message === "string"
          ? body.message
          : "Expo push failed";
    throw new Error(detail);
  }

  const tickets = Array.isArray(body?.data) ? body.data : [];
  const ticketError = tickets.find(
    (ticket: { status?: string; message?: string }) => ticket?.status === "error"
  );
  if (ticketError?.message) {
    throw new Error(ticketError.message);
  }

  return body;
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(jwt);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as RequestBody;
    const action = body.action;

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
          data: {
            type: "test",
            route: "/(app)/(tabs)/dashboard",
          },
        }))
      );

      return json({ success: true, sent: pushTokens.length, result });
    }

    if (action === "missing_expense") {
      const callerIsAdmin = await isAdmin(admin, user.id);
      if (!callerIsAdmin) return json({ error: "Admin access required" }, 403);

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
            created_by: user.id,
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
      if (pushTokens.length === 0) {
        return json({ error: "Target user has no enabled push tokens", reminderId }, 400);
      }

      const title = "Missing expense";
      const pushBody = body.note?.trim()
        ? body.note.trim()
        : `Please submit ${formatMoney(amount)} at ${merchant}.`;

      const result = await sendExpoPush(
        pushTokens.map((token) => ({
          to: token,
          title,
          body: pushBody,
          sound: "default",
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

      await admin
        .from("expense_reminders")
        .update({ status: "notified", notified_at: new Date().toISOString() })
        .eq("id", reminderId);

      return json({ success: true, sent: pushTokens.length, reminderId, result });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Push send failed";
    return json({ error: message }, 500);
  }
});
