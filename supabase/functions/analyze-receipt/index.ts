import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REGIONS: Record<string, string> = {
  cpx: "CPX", pdx_north: "PDX North", apx: "APX", pdx: "PDX",
  pdx_south: "PDX South", pdx_west: "PDX West", apx_california: "APX California",
};

const ROLES: Record<string, string> = {
  regional_manager: "Regional Manager", kam: "Key Account Manager (KAM)",
};

function buildPrompt(ctx: { userRegion: string; userRole: string; payPeriodStart: string; payPeriodEnd: string }) {
  return `You are an expense report assistant for Parts Distribution Xpress (PDX).
Analyze this receipt and return JSON only. Every line item MUST use exactly one category key from this list:
- travel_lodging: TRV / LOD (travel, hotels, lodging, airfare)
- tolls_parking: Toll/Parking (tolls, parking fees, garage)
- office_supplies: OFF. SUP & EQP (office supplies and equipment)
- meals_entertainment: Meals & Enter. (meals, restaurants, client entertainment)
- vehicle_maintenance: Cell & / M (cell phone, mobile plans, telecom)
- marketing: Marketing (advertising, promotional materials)
- misc: Misc. (anything that does not fit above)

Do NOT invent category names. Pick the closest match from the keys above.

{
  "merchant_name": "string",
  "expense_date": "YYYY-MM-DD or null",
  "description": "string",
  "related_to": "client/account/business purpose for RELATED TO column",
  "total_amount": number,
  "primary_category": "one of the keys above",
  "line_items": [{ "description": "string", "amount": number, "category": "one of the keys above" }],
  "confidence": 0-1,
  "notes": "optional"
}
User region: ${ctx.userRegion}. Role: ${ctx.userRole}. Pay period: ${ctx.payPeriodStart} to ${ctx.payPeriodEnd}.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

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
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error("Unauthorized");

    const { reportId, imageBase64, mimeType, fileName } = await req.json();
    if (!reportId || !imageBase64) throw new Error("reportId and imageBase64 required");

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OpenAI not configured");

    const { data: report } = await supabase
      .from("expense_reports")
      .select("*")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();
    if (!report) throw new Error("Report not found");
    if (report.status !== "draft" && report.status !== "rejected") {
      throw new Error("Cannot add receipts to submitted report");
    }

    const { data: profile } = await supabase.from("profiles").select("region, role").eq("id", user.id).single();

    const ext = fileName?.split(".").pop()?.toLowerCase() ?? "jpg";
    const storagePath = `${user.id}/${reportId}/${crypto.randomUUID()}.${ext}`;

    const binary = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
    const { error: uploadError } = await admin.storage.from("receipts").upload(storagePath, binary, {
      contentType: mimeType || "image/jpeg",
      upsert: false,
    });
    if (uploadError) throw new Error("Failed to store receipt");

    const prompt = buildPrompt({
      userRegion: profile ? REGIONS[profile.region] ?? profile.region : "PDX",
      userRole: profile ? ROLES[profile.role] ?? profile.role : "Employee",
      payPeriodStart: report.pay_period_start,
      payPeriodEnd: report.pay_period_end,
    });

    const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
    const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`, detail: "high" } },
          ],
        }],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      }),
    });

    const oaiData = await oaiRes.json();
    const rawContent = oaiData.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("AI returned no analysis");

    const analysis = JSON.parse(rawContent.replace(/```json\n?|\n?```/g, "").trim());

    const { data: signedUrlData } = await admin.storage.from("receipts").createSignedUrl(storagePath, 604800);

    await admin.from("receipt_uploads").insert({
      report_id: reportId,
      user_id: user.id,
      storage_path: storagePath,
      file_name: fileName ?? "receipt.jpg",
      mime_type: mimeType,
      ai_analysis: analysis,
      status: "analyzed",
    });

    return new Response(JSON.stringify({
      success: true,
      storagePath,
      previewUrl: signedUrlData?.signedUrl ?? null,
      fileName: fileName ?? "receipt.jpg",
      analysis,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
