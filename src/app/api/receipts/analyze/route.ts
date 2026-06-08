import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  buildReceiptAnalysisPrompt,
  parseReceiptAnalysis,
} from "@/lib/receipt-analysis";
import {
  ALLOWED_RECEIPT_TYPES,
  getOpenAIClient,
  getOpenAIModel,
  isOpenAIConfigured,
  MAX_RECEIPT_SIZE_BYTES,
} from "@/lib/openai/client";
import { getRegionLabel, getRoleLabel } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { error: "OpenAI is not configured. Add OPENAI_API_KEY to your environment." },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const reportId = formData.get("reportId") as string | null;

    if (!file || !reportId) {
      return NextResponse.json({ error: "File and reportId are required" }, { status: 400 });
    }

    if (!ALLOWED_RECEIPT_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Upload JPEG, PNG, or WebP images." },
        { status: 400 }
      );
    }

    if (file.size > MAX_RECEIPT_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large. Maximum size is 10 MB." }, { status: 400 });
    }

    const { data: report, error: reportError } = await supabase
      .from("expense_reports")
      .select("*")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.status !== "draft" && report.status !== "rejected") {
      return NextResponse.json({ error: "Cannot add receipts to a submitted report" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("region, role")
      .eq("id", user.id)
      .single();

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const storagePath = `${user.id}/${reportId}/${crypto.randomUUID()}.${ext}`;

    const admin = createServiceClient();
    const { error: uploadError } = await admin.storage
      .from("receipts")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        {
          error:
            "Failed to store receipt. Ensure the 'receipts' storage bucket exists in Supabase (run supabase/receipts-migration.sql).",
        },
        { status: 500 }
      );
    }

    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    const prompt = buildReceiptAnalysisPrompt({
      userRegion: profile ? getRegionLabel(profile.region as never) : "PDX",
      userRole: profile ? getRoleLabel(profile.role as never) : "Employee",
      payPeriodStart: report.pay_period_start,
      payPeriodEnd: report.pay_period_end,
    });

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: getOpenAIModel(),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json({ error: "AI returned no analysis" }, { status: 500 });
    }

    const analysis = parseReceiptAnalysis(rawContent);

    const { data: signedUrlData } = await admin.storage
      .from("receipts")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days

    await admin.from("receipt_uploads").insert({
      report_id: reportId,
      user_id: user.id,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      ai_analysis: analysis,
      status: "analyzed",
    });

    return NextResponse.json({
      success: true,
      storagePath,
      previewUrl: signedUrlData?.signedUrl ?? null,
      fileName: file.name,
      analysis,
    });
  } catch (error) {
    console.error("Receipt analyze error:", error);
    const message = error instanceof Error ? error.message : "Failed to analyze receipt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
