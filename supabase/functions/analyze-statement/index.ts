import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ParsedTxn = {
  date: string | null;
  merchant: string;
  amount: number;
  category: string | null;
};

type ParsedStatement = {
  period_start: string | null;
  period_end: string | null;
  statement_total: number | null;
  transactions: ParsedTxn[];
};

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11,
  december: 12, dec: 12,
};

const SKIP_MERCHANT =
  /payment thank|autopay|automatic payment|online payment|payment received|credit\s*$|returned payment|balance transfer|annual fee credit/i;
const SKIP_LINE = /^total|^subtotal|^balance|^fees charged|^interest charged|^new balance|^minimum payment|^account total/i;

function parseMoney(raw: string): number {
  const n = Number(String(raw).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoDate(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function parseUsDate(str: string): { y: number; m: number; d: number } | null {
  const s = str.trim().replace(/,/g, "");
  let m = s.match(/^(\w+)\s+(\d{1,2})\s+(\d{4})$/i);
  if (m) {
    const month = MONTHS[m[1].toLowerCase()];
    if (!month) return null;
    return { y: Number(m[3]), m: month, d: Number(m[2]) };
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return { y: Number(m[3]), m: Number(m[1]), d: Number(m[2]) };
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  return null;
}

function parsePeriod(text: string): { start: string | null; end: string | null } {
  const patterns = [
    /(?:Opening\/Closing Date|Billing Period|Statement Period|Account Period)[:\s]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})\s*(?:through|to|–|-)\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /([A-Za-z]+\s+\d{1,2},?\s+\d{4})\s*(?:through|to|–|-)\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const start = parseUsDate(m[1]);
    const end = parseUsDate(m[2]);
    if (start && end) {
      return {
        start: toIsoDate(start.y, start.m, start.d),
        end: toIsoDate(end.y, end.m, end.d),
      };
    }
  }
  return { start: null, end: null };
}

function parseStatementTotal(text: string): number | null {
  const patterns = [
    /New Balance\s*\$?\s*([\d,]+\.\d{2})/i,
    /Total Account Activity\s*\$?\s*([\d,]+\.\d{2})/i,
    /Statement Balance\s*\$?\s*([\d,]+\.\d{2})/i,
    /Current Balance\s*\$?\s*([\d,]+\.\d{2})/i,
    /Total Purchases(?: and Other Debits)?\s*\$?\s*([\d,]+\.\d{2})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const amt = parseMoney(m[1]);
      if (amt > 0) return amt;
    }
  }
  return null;
}

function inferTxnYear(mm: number, period: { start: string | null; end: string | null }): number {
  const end = period.end ? parseUsDate(period.end) : null;
  const start = period.start ? parseUsDate(period.start) : null;
  const anchor = end ?? start;
  if (!anchor) return new Date().getFullYear();
  if (start && end && start.y !== end.y && mm < end.m) return end.y - 1;
  return anchor.y;
}

function normalizeMerchant(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function dedupeTransactions(transactions: ParsedTxn[]): ParsedTxn[] {
  const seen = new Set<string>();
  const out: ParsedTxn[] = [];
  for (const t of transactions) {
    const key = `${t.date ?? ""}|${t.merchant.toLowerCase()}|${t.amount.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** Deterministic Chase Ink / business card text parser */
function parseChaseStatementText(text: string): ParsedStatement {
  const period = parsePeriod(text);
  const statement_total = parseStatementTotal(text);
  const activityIdx = text.search(/Account Activity/i);
  const body = activityIdx >= 0 ? text.slice(activityIdx) : text;
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const transactions: ParsedTxn[] = [];
  const dualDateRe = /^(\d{2}\/\d{2})\s+(\d{2}\/\d{2})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})$/;
  const singleDateRe = /^(\d{2}\/\d{2})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})$/;
  const amountOnlyRe = /^(-?\$?[\d,]+\.\d{2})$/;
  const dateOnlyRe = /^(\d{2}\/\d{2})$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    let match = dualDateRe.exec(line);
    if (match) {
      const [, transDate, , merchantRaw, amountRaw] = match;
      const amount = parseMoney(amountRaw);
      const merchant = normalizeMerchant(merchantRaw);
      if (amount <= 0 || SKIP_MERCHANT.test(merchant) || SKIP_LINE.test(merchant)) continue;
      const [mm, dd] = transDate.split("/").map(Number);
      const y = inferTxnYear(mm, period);
      transactions.push({
        date: toIsoDate(y, mm, dd),
        merchant,
        amount,
        category: null,
      });
      continue;
    }

    match = singleDateRe.exec(line);
    if (match) {
      const [, transDate, merchantRaw, amountRaw] = match;
      const amount = parseMoney(amountRaw);
      const merchant = normalizeMerchant(merchantRaw);
      if (amount <= 0 || SKIP_MERCHANT.test(merchant) || SKIP_LINE.test(merchant)) continue;
      const [mm, dd] = transDate.split("/").map(Number);
      const y = inferTxnYear(mm, period);
      transactions.push({
        date: toIsoDate(y, mm, dd),
        merchant,
        amount,
        category: null,
      });
      continue;
    }

    // Multi-line Chase layout: MM/DD on one line, merchant lines, amount on last line
    const dateMatch = dateOnlyRe.exec(line);
    if (dateMatch && i + 1 < lines.length) {
      const transDate = dateMatch[1];
      const chunk: string[] = [];
      let j = i + 1;
      let amount = 0;
      while (j < lines.length && j < i + 6) {
        const next = lines[j];
        if (dateOnlyRe.test(next) || dualDateRe.test(next) || singleDateRe.test(next)) break;
        if (amountOnlyRe.test(next)) {
          amount = parseMoney(next);
          j++;
          break;
        }
        if (/^[A-Z][A-Z\s\.']{4,}$/.test(next) && !/\d/.test(next)) {
          j++;
          continue; // cardholder name header
        }
        chunk.push(next);
        j++;
      }
      if (amount > 0 && chunk.length) {
        const merchant = normalizeMerchant(chunk.join(" "));
        if (!SKIP_MERCHANT.test(merchant) && !SKIP_LINE.test(merchant)) {
          const [mm, dd] = transDate.split("/").map(Number);
          const y = inferTxnYear(mm, period);
          transactions.push({
            date: toIsoDate(y, mm, dd),
            merchant,
            amount,
            category: null,
          });
        }
      }
      i = j - 1;
    }
  }

  // Fallback: scan whitespace-normalized activity blob for inline rows
  if (transactions.length < 5) {
    const flat = body.replace(/\s+/g, " ");
    const inlineRe = /(\d{2}\/\d{2})\s+(?:\d{2}\/\d{2}\s+)?([A-Z0-9][A-Z0-9\s\*\#\.\,\-\&\/\']{4,}?)\s+(-?\$?[\d,]+\.\d{2})/g;
    let m: RegExpExecArray | null;
    while ((m = inlineRe.exec(flat)) !== null) {
      const amount = parseMoney(m[3]);
      const merchant = normalizeMerchant(m[2]);
      if (amount <= 0 || SKIP_MERCHANT.test(merchant) || SKIP_LINE.test(merchant)) continue;
      const [mm, dd] = m[1].split("/").map(Number);
      const y = inferTxnYear(mm, period);
      transactions.push({
        date: toIsoDate(y, mm, dd),
        merchant,
        amount,
        category: null,
      });
    }
  }

  return {
    period_start: period.start,
    period_end: period.end,
    statement_total,
    transactions: dedupeTransactions(transactions),
  };
}

function normalizeTransactions(parsed: Record<string, unknown>): ParsedTxn[] {
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
  const transactions: ParsedTxn[] = [];

  for (const page of pages) {
    if (page.period_start) period_start = String(page.period_start).slice(0, 10);
    if (page.period_end) period_end = String(page.period_end).slice(0, 10);
    if (page.statement_total != null && !Number.isNaN(Number(page.statement_total))) {
      statement_total = Number(page.statement_total);
    }
    transactions.push(...normalizeTransactions(page));
  }

  return {
    period_start,
    period_end,
    statement_total,
    transactions: dedupeTransactions(transactions),
  };
}

function parsedSum(transactions: { amount: number }[]): number {
  return Math.round(transactions.reduce((s, t) => s + t.amount, 0) * 100) / 100;
}

function parseQuality(
  transactions: ParsedTxn[],
  statement_total: number | null
): number {
  if (!transactions.length) return 0;
  let score = Math.min(transactions.length / 8, 1) * 0.45;
  if (statement_total && statement_total > 0) {
    const sum = parsedSum(transactions);
    const gapRatio = Math.abs(statement_total - sum) / statement_total;
    score += Math.max(0, 1 - gapRatio * 4) * 0.55;
  } else {
    score += 0.25;
  }
  return score;
}

function buildParseWarning(transactions: { amount: number }[], statement_total: number | null) {
  if (statement_total == null || statement_total <= 0) return null;
  const sum = parsedSum(transactions);
  const gap = Math.abs(statement_total - sum);
  const tolerance = Math.max(5, statement_total * 0.015);
  if (gap <= tolerance) return null;
  return (
    `Parsed ${transactions.length} charges totaling $${sum.toLocaleString("en-US", { minimumFractionDigits: 2 })} ` +
    `but statement total is $${statement_total.toLocaleString("en-US", { minimumFractionDigits: 2 })} ` +
    `(gap ~$${gap.toFixed(2)}). Review missing rows or adjust Statement total.`
  );
}

const TEXT_PROMPT = `Parse this Chase business credit card statement text.
Extract EVERY purchase/charge row from Account Activity sections (all cardholders).
Skip payments, autopay credits, balance transfers, and subtotal lines.

Return JSON only:
{
  "period_start": "YYYY-MM-DD or null",
  "period_end": "YYYY-MM-DD or null",
  "statement_total": number or null,
  "transactions": [
    { "date": "YYYY-MM-DD", "merchant": "string", "amount": number }
  ]
}

amount is POSITIVE for charges. Use the transaction date column.

Statement text:
`;

function pageVisionPrompt(pageNum: number, totalPages: number) {
  return `Chase Ink / Chase business credit card statement — PAGE ${pageNum} of ${totalPages}.

This page may be a scan/photo. Extract EVERY charge/purchase row from "Account Activity" or transaction tables on THIS PAGE ONLY.

Layout hints:
- Columns are often: Transaction Date | Post Date | Description/Merchant | Amount
- Cardholder subsections (e.g. employee names in ALL CAPS) group rows — include ALL subsections
- Each merchant line is ONE transaction — never merge rows
- Amounts at end of row; purchases are POSITIVE numbers
- Skip: payments, autopay, credits/refunds, "Total fees", balance lines, section headers

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
  const batchSize = 3;

  for (let i = 0; i < totalPages; i += batchSize) {
    const batch = pageImages.slice(i, i + batchSize);
    const batchParsed = await Promise.all(
      batch.map((image, batchIdx) => {
        const pageNum = i + batchIdx + 1;
        return callOpenAI(visionModel, [
          { type: "text", text: pageVisionPrompt(pageNum, totalPages) },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${image}`, detail: "high" },
          },
        ]);
      })
    );
    pageResults.push(...batchParsed);
  }

  return mergePageParses(pageResults);
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const extracted = await extractText(pdf, { mergePages: true });
  return typeof extracted.text === "string" ? extracted.text : String(extracted.text || "");
}

function pickBestParse(
  candidates: Array<{ data: ParsedStatement; source: string }>,
  statementTotalHint: number | null
): { data: ParsedStatement; source: string } | null {
  let best: { data: ParsedStatement; source: string; score: number } | null = null;
  for (const c of candidates) {
    const total = c.data.statement_total ?? statementTotalHint;
    const score = parseQuality(c.data.transactions, total);
    if (!best || score > best.score) best = { ...c, score };
  }
  if (!best || best.score < 0.35) return null;
  return { data: best.data, source: best.source };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const body = await req.json();
    const { fileBase64, mimeType, fileName, storagePath, pageImages, statementText } = body;

    if (!fileBase64 && !storagePath && !(pageImages?.length) && !statementText) {
      throw new Error("storagePath, statementText, or pageImages required");
    }

    const defaultModel = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
    const visionModel = Deno.env.get("OPENAI_VISION_MODEL") || "gpt-4o";
    const isPdf =
      (mimeType || "").includes("pdf") ||
      (fileName || "").toLowerCase().endsWith(".pdf") ||
      (storagePath || "").toLowerCase().endsWith(".pdf") ||
      Boolean(pageImages?.length) ||
      Boolean(statementText);

    if (!isPdf) {
      throw new Error("Non-PDF files should be parsed client-side (.xlsx)");
    }

    const candidates: Array<{ data: ParsedStatement; source: string }> = [];
    let pdfText = typeof statementText === "string" ? statementText : "";

    if (!pdfText.trim() && (fileBase64 || storagePath)) {
      const bytes = await loadPdfBytes(fileBase64, storagePath);
      pdfText = await extractPdfText(bytes);
    }

    if (pdfText.trim().length > 200) {
      const deterministic = parseChaseStatementText(pdfText);
      if (deterministic.transactions.length) {
        candidates.push({ data: deterministic, source: "pdf_text" });
      }

      if (deterministic.transactions.length < 15 || parseQuality(
        deterministic.transactions,
        deterministic.statement_total
      ) < 0.75) {
        try {
          const aiParsed = await callOpenAI(
            defaultModel,
            TEXT_PROMPT + pdfText.slice(0, 120000),
            12000
          );
          candidates.push({
            data: {
              period_start: aiParsed.period_start ? String(aiParsed.period_start).slice(0, 10) : deterministic.period_start,
              period_end: aiParsed.period_end ? String(aiParsed.period_end).slice(0, 10) : deterministic.period_end,
              statement_total: aiParsed.statement_total != null
                ? Number(aiParsed.statement_total)
                : deterministic.statement_total,
              transactions: normalizeTransactions(aiParsed),
            },
            source: "pdf_ai",
          });
        } catch {
          /* AI text fallback optional */
        }
      }
    }

    if (pageImages?.length) {
      const visionMerged = await parseVisionPages((pageImages as string[]).slice(0, 14), visionModel);
      candidates.push({ data: visionMerged, source: "pdf_vision" });
    }

    const statementTotalHint =
      candidates.find((c) => c.data.statement_total != null)?.data.statement_total ?? null;

    const best = pickBestParse(candidates, statementTotalHint);

    if (!best) {
      if (pdfText.trim().length < 200 && !(pageImages?.length)) {
        return new Response(
          JSON.stringify({
            ok: false,
            needs_vision: true,
            error: "Scanned PDF — send pageImages for vision parsing",
          }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Could not extract charges from this PDF — try re-uploading or check the file is a Chase statement");
    }

    let { period_start, period_end, statement_total, transactions } = best.data;
    if (!statement_total && statementTotalHint) statement_total = statementTotalHint;

    const parse_warning = buildParseWarning(transactions, statement_total);
    const parsed_sum = parsedSum(transactions);

    return new Response(
      JSON.stringify({
        ok: true,
        period_start,
        period_end,
        statement_total,
        parsed_sum,
        parse_warning,
        transactions,
        parse_source: best.source,
        text_chars: pdfText.length,
        page_images: pageImages?.length ?? 0,
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
