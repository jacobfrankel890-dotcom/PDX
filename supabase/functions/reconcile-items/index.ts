import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type LineItem = {
  id: string;
  user_id: string | null;
  expense_date: string | null;
  description: string | null;
  related_to: string | null;
  row_total: number;
  profile: { first_name: string | null; last_name: string | null };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const dateFrom = body.dateFrom ? String(body.dateFrom).slice(0, 10) : null;
    const dateTo = body.dateTo ? String(body.dateTo).slice(0, 10) : null;
    const employeeId = body.employeeId ? String(body.employeeId) : null;

    const baseUrl = Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let path =
      "expense_line_items?select=id,expense_date,description,related_to,row_total," +
      "expense_reports!inner(status,user_id,profiles!expense_reports_user_id_fkey(first_name,last_name))" +
      "&expense_reports.status=in.(submitted,approved)";

    if (dateFrom) path += `&expense_date=gte.${encodeURIComponent(dateFrom)}`;
    if (dateTo) path += `&expense_date=lte.${encodeURIComponent(dateTo)}`;
    if (employeeId) path += `&expense_reports.user_id=eq.${encodeURIComponent(employeeId)}`;
    path += "&order=expense_date.asc";

    const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    let rows: Record<string, unknown>[] = [];
    try {
      rows = text ? JSON.parse(text) : [];
    } catch {
      throw new Error(text.slice(0, 200) || "Supabase query failed");
    }
    if (!res.ok) {
      const msg =
        (rows as { message?: string })?.message ||
        (typeof rows === "object" && rows && "error" in rows ? String((rows as { error: string }).error) : "") ||
        "Supabase query failed";
      throw new Error(msg);
    }

    const items: LineItem[] = (Array.isArray(rows) ? rows : []).map((row) => {
      const report = row.expense_reports as {
        user_id?: string;
        profiles?: { first_name?: string; last_name?: string } | null;
      } | null;
      const profile = report?.profiles ?? {};
      return {
        id: String(row.id),
        user_id: report?.user_id ?? null,
        expense_date: row.expense_date ? String(row.expense_date).slice(0, 10) : null,
        description: row.description ? String(row.description) : null,
        related_to: row.related_to ? String(row.related_to) : null,
        row_total: Number(row.row_total || 0),
        profile: {
          first_name: profile.first_name ?? null,
          last_name: profile.last_name ?? null,
        },
      };
    });

    return json({ ok: true, items });
  } catch (err) {
    return json({ ok: false, error: (err as Error).message || "Fetch failed" }, 400);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
