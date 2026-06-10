import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TEXT_PROMPT = `Parse this Chase business credit card statement text.
Extract every purchase/charge (skip payments, autopay credits, balance transfers).

Return JSON only:
{
  "period_start": "YYYY-MM-DD or null",
  "period_end": "YYYY-MM-DD or null",
  "statement_total": number or null,
  "transactions": [
    { "date": "YYYY-MM-DD", "merchant": "string", "amount": number, "category": "optional" }
  ]
}

amount is POSITIVE for charges. merchant is the description field cleaned up.

Statement text:
`;

function pageVisionPrompt(pageNum: number, totalPages: number) {
  return `Chase Ink / business credit card statement — PAGE ${pageNum} of ${totalPages} (scanned image).

Extract EVERY purchase/charge row visible on THIS PAGE ONLY.

Rules:
- Include ALL cardholder subsections (e.g. MICHAEL P FRANKEL, KIMBERLY BRISCO, VINCENT LAMBERT).
- Each line in "Account Activity" is its own transaction — do NOT skip rows, do NOT summarize.
- Skip ONLY: payments, autopay, credits/refunds, section subtotals, "Total fees charged", balance lines.
- Use the transaction date from each row (MM/DD); infer year from the billing period on the statement.
- amount is POSITIVE for purchases/charges.

Return JSON only:
{
  "period_start": "YYYY-MM-DD or null",
  "period_end": "YYYY-MM-DD or null",
  "statement_total": number or null,
  "transactions": [
    { "date": "YYYY-MM-DD", "merchant": "string", "amount": number }
  ]
}`;
}

async function loadPdfBytes(fileBase64?: string, storagePath?: string): Promise<Uint8Array> {
  if (storagePath) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Storage download not configured on edge function");
    }
    const encoded = storagePath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const res = await fetch(`${supabaseUrl}/storage/v1/object/statements/${encoded}`, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Could not load uploaded statement from storage");
    }
    return new Uint8Array(await res.arrayBuffer());
  }

  if (!fileBase64) throw new Error("fileBase64 or storagePath required");
  return Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
}

function normalizeTransactions(parsed: Record<string, unknown>) {
  return ((parsed.transactions as Record<string, unknown>[]) || [])
    .map((t) => ({
      date: t.date ? String(t.date).slice(0, 10) : null,
      merchant: String(t.merchant || t.description || "").trim(),
      amount: Math.abs(Number(t.amount) || 0),
      category: t.category ? String(t.category) : null,
    }))
    .filter((t) => t.merchant && t.amount > 0);
}

function mergePageParses(pages: Record<string, unknown>[]) {
  let period_start: string | null = null;
  let period_end: string | null = null;
  let statement_total: number | null = null;
  const seen = new Set<string>();
  const transactions: ReturnType<typeof normalizeTransactions> = [];

  for (const page of pages) {
    if (page.period_start) period_start = String(page.period_start).slice(0, 10);
    if (page.period_end) period_end = String(page.period_end).slice(0, 10);
    if (page.statement_total != null && !Number.isNaN(Number(page.statement_total))) {
      statement_total = Number(page.statement_total);
    }
    for (const t of normalizeTransactions(page)) {
      const key = `${t.date}|${t.merchant.toLowerCase()}|${t.amount.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      transactions.push(t);
    }
  }

  return { period_start, period_end, statement_total, transactions };
}

function buildParseWarning(transactions: { amount: number }[], statement_total: number | null) {
  if (statement_total == null || statement_total <= 0) return null;
  const parsedSum = Math.round(transactions.reduce((s, t) => s + t.amount, 0) * 100) / 100;
  const gap = Math.abs(statement_total - parsedSum);
  if (gap <= Math.max(25, statement_total * 0.03)) return null;
  return (
    `Parsed ${transactions.length} charges totaling $${parsedSum.toLocaleString("en-US", { minimumFractionDigits: 2 })} ` +
    `but statement total is $${statement_total.toLocaleString("en-US", { minimumFractionDigits: 2 })} ` +
    `(missing ~$${gap.toFixed(2)}). For 100% accuracy, use the .xlsx download from Chase.`
  );
}

async function callOpenAI(model: string, content: string | unknown[], maxTokens = 8192) {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) throw new Error("OPENAI_API_KEY not configured in Supabase edge function secrets");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content }],
      max_tokens: maxTokens,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "OpenAI request failed");
  }

  const raw = payload?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty AI response");
  return JSON.parse(raw);
}

async function parseVisionPages(pageImages: string[], visionModel: string) {
  const totalPages = pageImages.length;
  const pageResults: Record<string, unknown>[] = [];

  for (let i = 0; i < totalPages; i++) {
    const parsed = await callOpenAI(visionModel, [
      { type: "text", text: pageVisionPrompt(i + 1, totalPages) },
      {
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${pageImages[i]}`, detail: "high" },
      },
    ]);
    pageResults.push(parsed);
  }

  return mergePageParses(pageResults);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const { fileBase64, mimeType, fileName, storagePath, pageImages } = await req.json();
    if (!fileBase64 && !storagePath && !(pageImages?.length)) {
      throw new Error("storagePath or pageImages required");
    }

    const defaultModel = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
    const visionModel = Deno.env.get("OPENAI_VISION_MODEL") || "gpt-4o";
    const isPdf =
      (mimeType || "").includes("pdf") ||
      (fileName || "").toLowerCase().endsWith(".pdf") ||
      (storagePath || "").toLowerCase().endsWith(".pdf") ||
      Boolean(pageImages?.length);

    let period_start: string | null = null;
    let period_end: string | null = null;
    let statement_total: number | null = null;
    let transactions: ReturnType<typeof normalizeTransactions> = [];
    let parseSource = "pdf_ai";

    if (pageImages?.length) {
      const merged = await parseVisionPages((pageImages as string[]).slice(0, 8), visionModel);
      period_start = merged.period_start;
      period_end = merged.period_end;
      statement_total = merged.statement_total;
      transactions = merged.transactions;
      parseSource = "pdf_vision";
    } else if (isPdf) {
      const bytes = await loadPdfBytes(fileBase64, storagePath);
      const pdf = await getDocumentProxy(bytes);
      const extracted = await extractText(pdf, { mergePages: true });
      const statementText =
        typeof extracted.text === "string" ? extracted.text : String(extracted.text || "");

      if (!statementText.trim()) {
        throw new Error(
          "This PDF is a scan with no text layer — reload the page and try again, or use the .xlsx export from Chase"
        );
      }

      const parsed = await callOpenAI(defaultModel, TEXT_PROMPT + statementText.slice(0, 120000));
      period_start = parsed.period_start ? String(parsed.period_start).slice(0, 10) : null;
      period_end = parsed.period_end ? String(parsed.period_end).slice(0, 10) : null;
      statement_total = parsed.statement_total != null ? Number(parsed.statement_total) : null;
      transactions = normalizeTransactions(parsed);
      parseSource = "pdf_ai";
    } else {
      throw new Error("Non-PDF files should be parsed client-side (.xlsx)");
    }

    const parse_warning = buildParseWarning(transactions, statement_total);
    const parsed_sum = Math.round(transactions.reduce((s, t) => s + t.amount, 0) * 100) / 100;

    return new Response(
      JSON.stringify({
        ok: true,
        period_start,
        period_end,
        statement_total,
        parsed_sum,
        parse_warning,
        transactions,
        parse_source: parseSource,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message || "Analyze failed" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
