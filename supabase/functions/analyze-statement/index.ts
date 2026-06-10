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
  /** Sum of purchases/charges (preferred validation target — not New Balance). */
  purchases_total: number | null;
  new_balance: number | null;
  transactions: ParsedTxn[];
};

type ChaseTotals = {
  purchases_total: number | null;
  new_balance: number | null;
  payments_total: number | null;
  fees_total: number | null;
};

type AccuracyResult = {
  transactions: ParsedTxn[];
  parsed_sum: number;
  gap: number;
  matched: boolean;
  removed: ParsedTxn[];
  target_total: number | null;
};

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11,
  december: 12, dec: 12,
};

const SKIP_MERCHANT =
  /payment thank|autopay|automatic payment|online payment|payment received|credit\s*$|returned payment|balance transfer|annual fee credit|credit card credit|rewards redemption/i;
const SKIP_LINE =
  /^total|^subtotal|^balance|^fees charged|^interest charged|^new balance|^minimum payment|^account total|^purchases$|^payments$|^credits$|^debits$|^summary|^page \d|^continued|^amount$/i;

function roundMoney(n: number): number {
  return Math.round(Number(n) * 100) / 100;
}

function parseChaseTotals(text: string): ChaseTotals {
  const pick = (patterns: RegExp[]): number | null => {
    for (const re of patterns) {
      const m = text.match(re);
      if (m) {
        const amt = parseMoney(m[1]);
        if (amt > 0) return amt;
      }
    }
    return null;
  };
  return {
    purchases_total: pick([
      /Total Purchases(?:\s+(?:and|&)\s+Other Debits)?\s+\$?\s*([\d,]+\.\d{2})/i,
      /Purchases(?:\s+(?:and|&)\s+Other Debits)\s+\$?\s*([\d,]+\.\d{2})/i,
      /Total Account Activity\s+\$?\s*([\d,]+\.\d{2})/i,
      /TOTAL PURCHASES\s+\$?\s*([\d,]+\.\d{2})/i,
    ]),
    new_balance: pick([
      /New Balance\s+\$?\s*([\d,]+\.\d{2})/i,
      /Statement Balance\s+\$?\s*([\d,]+\.\d{2})/i,
      /Current Balance\s+\$?\s*([\d,]+\.\d{2})/i,
    ]),
    payments_total: pick([
      /Total Payments(?:\s+(?:and|&)\s+Credits)?\s+-?\$?\s*([\d,]+\.\d{2})/i,
      /Payments and Other Credits\s+-?\$?\s*([\d,]+\.\d{2})/i,
    ]),
    fees_total: pick([
      /Total Fees(?:\s+(?:and|&)\s+Interest)?\s+\$?\s*([\d,]+\.\d{2})/i,
    ]),
  };
}

function attachChaseTotals(data: ParsedStatement, text: string): ParsedStatement {
  const totals = parseChaseTotals(text);
  const purchases_total = data.purchases_total ?? totals.purchases_total;
  const new_balance = data.new_balance ?? totals.new_balance;
  const statement_total =
    purchases_total ??
    data.statement_total ??
    new_balance;
  return {
    ...data,
    purchases_total,
    new_balance,
    statement_total,
  };
}

function filterValidCharges(transactions: ParsedTxn[]): ParsedTxn[] {
  return transactions.filter((t) => {
    if (!t.merchant || t.amount <= 0) return false;
    if (SKIP_MERCHANT.test(t.merchant)) return false;
    if (SKIP_LINE.test(t.merchant.trim())) return false;
    if (/^\d+$/.test(t.merchant.trim())) return false;
    if (t.amount > 50000) return false;
    return true;
  });
}

function merchantSimilarity(a: string, b: string): number {
  const norm = (value: string) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.9;
  const xw = new Set(x.split(" ").filter((w) => w.length > 2));
  const yw = new Set(y.split(" ").filter((w) => w.length > 2));
  let overlap = 0;
  xw.forEach((w) => { if (yw.has(w)) overlap += 1; });
  return overlap / Math.max(xw.size, yw.size, 1);
}

function removeNearDuplicates(transactions: ParsedTxn[]): { kept: ParsedTxn[]; removed: ParsedTxn[] } {
  const kept: ParsedTxn[] = [];
  const removed: ParsedTxn[] = [];
  for (const t of transactions) {
    const dupIdx = kept.findIndex(
      (k) =>
        k.date === t.date &&
        Math.abs(k.amount - t.amount) < 0.01 &&
        merchantSimilarity(k.merchant, t.merchant) >= 0.85
    );
    if (dupIdx >= 0) {
      if (t.merchant.length > kept[dupIdx].merchant.length) {
        removed.push(kept[dupIdx]);
        kept[dupIdx] = t;
      } else {
        removed.push(t);
      }
    } else {
      kept.push(t);
    }
  }
  return { kept, removed };
}

/** Trim phantom rows when parsed sum overshoots known purchases total. */
function accuracyReconcile(
  transactions: ParsedTxn[],
  targetTotal: number | null,
  tolerance = 0.02
): AccuracyResult {
  let txns = filterValidCharges(transactions);
  const dupPass = removeNearDuplicates(txns);
  txns = dupPass.kept;
  const removed = [...dupPass.removed];

  if (targetTotal == null || targetTotal <= 0) {
    const parsed_sum = parsedSum(txns);
    return {
      transactions: txns,
      parsed_sum,
      gap: 0,
      matched: false,
      removed,
      target_total: null,
    };
  }

  let parsed_sum = parsedSum(txns);
  let gap = roundMoney(parsed_sum - targetTotal);

  if (gap > tolerance) {
    const exactIdx = txns.findIndex((t) => Math.abs(t.amount - gap) < 0.011);
    if (exactIdx >= 0) {
      removed.push(...txns.splice(exactIdx, 1));
      parsed_sum = parsedSum(txns);
      gap = roundMoney(parsed_sum - targetTotal);
    }
  }

  if (gap > tolerance && gap < 100) {
    for (let i = 0; i < txns.length && gap > tolerance; i++) {
      for (let j = i + 1; j < txns.length && gap > tolerance; j++) {
        if (Math.abs(txns[i].amount + txns[j].amount - gap) < 0.011) {
          removed.push(txns[j], txns[i]);
          txns = txns.filter((_, idx) => idx !== i && idx !== j);
          parsed_sum = parsedSum(txns);
          gap = roundMoney(parsed_sum - targetTotal);
          break;
        }
      }
    }
  }

  return {
    transactions: txns,
    parsed_sum,
    gap: roundMoney(Math.abs(parsed_sum - targetTotal)),
    matched: Math.abs(parsed_sum - targetTotal) <= tolerance,
    removed,
    target_total: targetTotal,
  };
}

function mergeCandidateStatements(
  candidates: Array<{ data: ParsedStatement; source: string }>
): ParsedStatement {
  let period_start: string | null = null;
  let period_end: string | null = null;
  let purchases_total: number | null = null;
  let new_balance: number | null = null;
  let statement_total: number | null = null;
  const all: ParsedTxn[] = [];

  for (const c of candidates) {
    const d = c.data;
    if (d.period_start) period_start = d.period_start;
    if (d.period_end) period_end = d.period_end;
    if (d.purchases_total != null) purchases_total = d.purchases_total;
    if (d.new_balance != null) new_balance = d.new_balance;
    if (d.statement_total != null) statement_total = d.statement_total;
    all.push(...d.transactions);
  }

  const period = { start: period_start, end: period_end };
  const deduped = removeNearDuplicates(
    normalizeParsedTransactions(dedupeTransactions(all), period)
  ).kept;

  return {
    period_start,
    period_end,
    purchases_total,
    new_balance,
    statement_total: purchases_total ?? statement_total ?? new_balance,
    transactions: deduped,
  };
}

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

/** Chase vision often returns MM/DD — infer year from statement period. */
function normalizeTransactionDate(
  raw: unknown,
  period?: { start: string | null; end: string | null }
): string | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  const parsed = parseUsDate(s);
  if (parsed) return toIsoDate(parsed.y, parsed.m, parsed.d);

  const partial = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (partial) {
    const mm = Number(partial[1]);
    const dd = Number(partial[2]);
    const y = inferTxnYear(mm, period ?? { start: null, end: null });
    return toIsoDate(y, mm, dd);
  }

  return null;
}

function normalizeParsedTransactions(
  transactions: ParsedTxn[],
  period: { start: string | null; end: string | null }
): ParsedTxn[] {
  return transactions.map((t) => ({
    ...t,
    date: normalizeTransactionDate(t.date, period) ?? t.date,
  }));
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
  const chaseTotals = parseChaseTotals(text);
  const legacyTotal = parseStatementTotal(text);
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
    purchases_total: chaseTotals.purchases_total,
    new_balance: chaseTotals.new_balance ?? legacyTotal,
    statement_total: chaseTotals.purchases_total ?? legacyTotal ?? chaseTotals.new_balance,
    transactions: dedupeTransactions(transactions),
  };
}

function normalizeTransactions(
  parsed: Record<string, unknown>,
  period?: { start: string | null; end: string | null }
): ParsedTxn[] {
  const p = period ?? {
    start: parsed.period_start ? String(parsed.period_start).slice(0, 10) : null,
    end: parsed.period_end ? String(parsed.period_end).slice(0, 10) : null,
  };
  return ((parsed.transactions as Record<string, unknown>[]) || [])
    .map((t) => ({
      date: normalizeTransactionDate(t.date, p),
      merchant: String(t.merchant || t.description || "").trim(),
      amount: Math.abs(Number(t.amount) || 0),
      category: t.category ? String(t.category) : null,
    }))
    .filter((t) => t.merchant && t.amount > 0);
}

function mergePageParses(pages: Record<string, unknown>[]) {
  let period_start: string | null = null;
  let period_end: string | null = null;
  let purchases_total: number | null = null;
  let new_balance: number | null = null;
  let statement_total: number | null = null;
  const transactions: ParsedTxn[] = [];

  for (const page of pages) {
    if (page.period_start) period_start = String(page.period_start).slice(0, 10);
    if (page.period_end) period_end = String(page.period_end).slice(0, 10);
    if (page.purchases_total != null && !Number.isNaN(Number(page.purchases_total))) {
      purchases_total = Number(page.purchases_total);
    }
    if (page.new_balance != null && !Number.isNaN(Number(page.new_balance))) {
      new_balance = Number(page.new_balance);
    }
    if (page.statement_total != null && !Number.isNaN(Number(page.statement_total))) {
      statement_total = Number(page.statement_total);
    }
    transactions.push(...normalizeTransactions(page));
  }

  return {
    period_start,
    period_end,
    purchases_total,
    new_balance,
    statement_total: purchases_total ?? statement_total ?? new_balance,
    transactions: normalizeParsedTransactions(dedupeTransactions(transactions), {
      start: period_start,
      end: period_end,
    }),
  };
}

function parsedSum(transactions: { amount: number }[]): number {
  return Math.round(transactions.reduce((s, t) => s + t.amount, 0) * 100) / 100;
}

function parseQuality(
  transactions: ParsedTxn[],
  data: ParsedStatement,
  targetHint: number | null
): number {
  if (!transactions.length) return 0;
  const target = data.purchases_total ?? data.statement_total ?? targetHint;
  let score = Math.min(transactions.length / 8, 1) * 0.35;
  if (target && target > 0) {
    const sum = parsedSum(transactions);
    const gap = Math.abs(target - sum);
    const gapRatio = gap / target;
    if (gap <= 0.02) score += 0.55;
    else if (gap <= 1) score += 0.48;
    else if (gap <= 10) score += Math.max(0, 0.4 - gapRatio * 2);
    else score += Math.max(0, 0.35 - gapRatio * 3);
  } else {
    score += 0.2;
  }
  if (data.period_start && data.period_end) score += 0.1;
  return Math.min(score, 1);
}

function buildParseWarning(
  transactions: { amount: number }[],
  targetTotal: number | null,
  purchasesTotal: number | null,
  newBalance: number | null
) {
  if (targetTotal == null || targetTotal <= 0) return null;
  const sum = parsedSum(transactions);
  const gap = Math.abs(targetTotal - sum);
  const tolerance = Math.max(0.02, targetTotal * 0.001);
  if (gap <= tolerance) return null;
  let hint = "";
  if (purchasesTotal && newBalance && Math.abs(purchasesTotal - newBalance) > 1) {
    hint =
      " Note: New Balance includes payments/credits — validate against Total Purchases, not New Balance.";
  }
  return (
    `Parsed ${transactions.length} charges totaling $${sum.toLocaleString("en-US", { minimumFractionDigits: 2 })} ` +
    `but target is $${targetTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} ` +
    `(gap ~$${gap.toFixed(2)}).${hint}`
  );
}

const TEXT_PROMPT = `Parse this Chase business credit card statement text.
Extract EVERY purchase/charge row from Account Activity sections (all cardholders).
Skip payments, autopay credits, balance transfers, and subtotal lines.

IMPORTANT: "New Balance" is NOT the sum of charges. Extract "Total Purchases" or "Purchases and Other Debits" separately.

Return JSON only:
{
  "period_start": "YYYY-MM-DD or null",
  "period_end": "YYYY-MM-DD or null",
  "purchases_total": number or null,
  "new_balance": number or null,
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
- Extract purchases_total from summary if visible (Total Purchases / Purchases and Other Debits)
- Do NOT use New Balance as purchases_total

Return JSON only:
{
  "period_start": "YYYY-MM-DD or null",
  "period_end": "YYYY-MM-DD or null",
  "purchases_total": number or null,
  "new_balance": number or null,
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
  targetHint: number | null
): { data: ParsedStatement; source: string } | null {
  let best: { data: ParsedStatement; source: string; score: number } | null = null;
  for (const c of candidates) {
    const score = parseQuality(c.data.transactions, c.data, targetHint);
    if (!best || score > best.score) best = { ...c, score };
  }
  if (!best || best.score < 0.3) return null;
  return { data: best.data, source: best.source };
}

function aiParsedToStatement(
  aiParsed: Record<string, unknown>,
  fallback: ParsedStatement
): ParsedStatement {
  const period = {
    start: aiParsed.period_start ? String(aiParsed.period_start).slice(0, 10) : fallback.period_start,
    end: aiParsed.period_end ? String(aiParsed.period_end).slice(0, 10) : fallback.period_end,
  };
  const purchases_total =
    aiParsed.purchases_total != null ? Number(aiParsed.purchases_total) : fallback.purchases_total;
  const new_balance =
    aiParsed.new_balance != null ? Number(aiParsed.new_balance) : fallback.new_balance;
  return {
    period_start: period.start,
    period_end: period.end,
    purchases_total,
    new_balance,
    statement_total:
      purchases_total ??
      (aiParsed.statement_total != null ? Number(aiParsed.statement_total) : null) ??
      fallback.statement_total ??
      new_balance,
    transactions: normalizeTransactions(aiParsed, period),
  };
}

async function fetchReconcileItems(body: Record<string, unknown>) {
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

  const items = (Array.isArray(rows) ? rows : []).map((row) => {
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

  return new Response(JSON.stringify({ ok: true, items }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function normMerchant(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PROFILE_FIELDS =
  "id,first_name,last_name,email,phone,role,region,company,card_type,created_at";

const FLAGGED_FULL_SELECT =
  "id,user_id,merchant,amount,expense_date,note,status,notified_at,submitted_at,confirmed_at,created_at,resolution,expense_line_item_id," +
  `profiles!expense_reminders_user_id_fkey(${PROFILE_FIELDS}),` +
  "expense_line_items!expense_line_item_id(receipt_url,description,row_total,expense_date)";

const FLAGGED_BASIC_SELECT =
  "id,user_id,merchant,amount,expense_date,note,status,notified_at,submitted_at,created_at," +
  `profiles!expense_reminders_user_id_fkey(${PROFILE_FIELDS})`;

async function supabaseServiceQuery(path: string, init?: RequestInit) {
  const baseUrl = Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let data: unknown = [];
  try {
    data = text ? JSON.parse(text) : [];
  } catch {
    throw new Error(text.slice(0, 200) || "Supabase query failed");
  }
  if (!res.ok) {
    const msg =
      (data as { message?: string })?.message ||
      (data as { error?: string })?.error ||
      text.slice(0, 200) ||
      "Supabase query failed";
    throw new Error(msg);
  }
  return data;
}

async function signReceiptUrl(urlOrPath: string | null | undefined): Promise<string | null> {
  if (!urlOrPath) return null;
  const trimmed = String(urlOrPath).trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;

  const baseUrl = Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const encodedPath = trimmed
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const res = await fetch(`${baseUrl}/storage/v1/object/sign/receipts/${encodedPath}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: 3600 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  const signed = (data as { signedURL?: string; signedUrl?: string }).signedURL ||
    (data as { signedUrl?: string }).signedUrl;
  if (!signed) return null;
  if (signed.startsWith("http")) return signed;
  return `${baseUrl}/storage/v1${signed.startsWith("/") ? signed : `/${signed}`}`;
}

function mapFlaggedReminderRow(row: Record<string, unknown>) {
  const profile = (row.profiles || {}) as Record<string, unknown>;
  const line = (row.expense_line_items || null) as Record<string, unknown> | null;
  return {
    id: row.id,
    user_id: row.user_id,
    merchant: row.merchant,
    amount: roundMoney(Number(row.amount)),
    expense_date: row.expense_date ? String(row.expense_date).slice(0, 10) : null,
    note: row.note,
    status: row.status,
    resolution: row.resolution || null,
    notified_at: row.notified_at,
    submitted_at: row.submitted_at,
    confirmed_at: row.confirmed_at ?? null,
    created_at: row.created_at,
    expense_line_item_id: row.expense_line_item_id || null,
    employee: {
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
      company: profile.company,
      region: profile.region,
      role: profile.role,
      card_type: profile.card_type,
    },
    expense: line
      ? {
          description: line.description,
          row_total: line.row_total,
          expense_date: line.expense_date,
          receipt_url: line.receipt_url,
        }
      : null,
    receipt_image_url: null as string | null,
  };
}

async function enrichFlaggedRows(rows: Record<string, unknown>[]) {
  const mapped = (rows || []).map(mapFlaggedReminderRow);
  await Promise.all(
    mapped.map(async (row) => {
      if (row.expense?.receipt_url) {
        row.receipt_image_url = await signReceiptUrl(String(row.expense.receipt_url));
      }
    })
  );
  return mapped;
}

async function fetchFlaggedReminders(filter: "pending" | "confirmed") {
  const statusQuery =
    filter === "confirmed"
      ? "status=eq.confirmed"
      : "status=in.(pending,notified,no_receipt,submitted)";
  const order =
    filter === "confirmed"
      ? "order=confirmed_at.desc.nullslast,created_at.desc"
      : "order=created_at.desc";

  let rows: Record<string, unknown>[] = [];
  try {
    rows = (await supabaseServiceQuery(
      `expense_reminders?${statusQuery}&select=${FLAGGED_FULL_SELECT}&${order}&limit=500`
    )) as Record<string, unknown>[];
  } catch (err) {
    const msg = String((err as Error).message || err);
    if (/confirmed_at|resolution|expense_line_item|relationship|schema cache/i.test(msg)) {
      rows = (await supabaseServiceQuery(
        `expense_reminders?${statusQuery}&select=${FLAGGED_BASIC_SELECT}&order=created_at.desc&limit=500`
      )) as Record<string, unknown>[];
    } else {
      throw err;
    }
  }
  return enrichFlaggedRows(rows);
}

async function listFlaggedPending() {
  const items = await fetchFlaggedReminders("pending");
  return new Response(JSON.stringify({ ok: true, items }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function listFlaggedConfirmed() {
  const items = await fetchFlaggedReminders("confirmed");
  return new Response(JSON.stringify({ ok: true, items }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function confirmFlaggedReminder(body: Record<string, unknown>) {
  const reminderId = body.reminderId ? String(body.reminderId) : null;
  if (!reminderId) throw new Error("Missing reminderId");

  let rows: Record<string, unknown>[];
  try {
    rows = (await supabaseServiceQuery(
      `expense_reminders?id=eq.${encodeURIComponent(reminderId)}&status=in.(no_receipt,submitted,pending,notified)`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
          resolution: "admin",
        }),
      }
    )) as Record<string, unknown>[];
  } catch (err) {
    const msg = String((err as Error).message || err);
    if (/confirmed|check constraint|schema cache/i.test(msg)) {
      throw new Error(
        "Run supabase/expense-reminders-confirmed-migration.sql in Supabase SQL editor, then retry."
      );
    }
    throw err;
  }
  if (!rows?.[0]) throw new Error("Reminder not found or already confirmed");
  const [enriched] = await enrichFlaggedRows(rows);
  return new Response(JSON.stringify({ ok: true, item: enriched }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function dismissFlaggedReminder(body: Record<string, unknown>) {
  const reminderId = body.reminderId ? String(body.reminderId) : null;
  if (!reminderId) throw new Error("Missing reminderId");

  const rows = (await supabaseServiceQuery(
    `expense_reminders?id=eq.${encodeURIComponent(reminderId)}&status=neq.dismissed`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status: "dismissed" }),
    }
  )) as Record<string, unknown>[];
  if (!rows?.[0]) throw new Error("Reminder not found or already dismissed");
  return new Response(JSON.stringify({ ok: true, item: mapFlaggedReminderRow(rows[0]) }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function flagMissingExpense(body: Record<string, unknown>) {
  const userId = body.userId ? String(body.userId) : null;
  const merchant = String(body.merchant || "Unknown").trim().slice(0, 200);
  const amount = roundMoney(Number(body.amount));
  const expenseDate = body.expenseDate
    ? normalizeTransactionDate(String(body.expenseDate), {
        start: body.periodStart ? String(body.periodStart).slice(0, 10) : null,
        end: body.periodEnd ? String(body.periodEnd).slice(0, 10) : null,
      })
    : null;
  const note = body.note ? String(body.note) : null;
  const forceNotify = Boolean(body.forceNotify);

  if (!userId) throw new Error("Select the cardholder before flagging.");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid charge amount — refresh reconciliation and try again.");
  }

  const baseUrl = Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const pushNote =
    note ||
    `Charge on your card: $${amount.toFixed(2)} at ${merchant}. ` +
    "Open PDX Expense to upload a receipt or explain this charge.";

  let reminderId: string | null = null;
  let alreadyNotified = false;

  const existingPath =
    `expense_reminders?user_id=eq.${encodeURIComponent(userId)}` +
    `&amount=eq.${amount}&status=in.(pending,notified)` +
    (expenseDate ? `&expense_date=eq.${encodeURIComponent(expenseDate)}` : "") +
    "&select=id,merchant,notified_at&limit=5";

  const existingRes = await fetch(`${baseUrl}/rest/v1/${existingPath}`, {
    headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
  });
  const existingText = await existingRes.text();
  let existingRows: Array<{ id?: string; merchant?: string; notified_at?: string | null }> = [];
  try {
    existingRows = existingText ? JSON.parse(existingText) : [];
  } catch {
    /* ignore lookup errors */
  }
  const match = (Array.isArray(existingRows) ? existingRows : []).find(
    (row) => normMerchant(String(row.merchant)) === normMerchant(merchant)
  );
  if (match?.id) {
    reminderId = String(match.id);
    alreadyNotified = Boolean(match.notified_at);
  }

  if (!reminderId) {
    const insertRes = await fetch(`${baseUrl}/rest/v1/expense_reminders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: userId,
        merchant,
        amount,
        expense_date: expenseDate,
        note: pushNote,
        status: "pending",
      }),
    });
    const insertText = await insertRes.text();
    if (!insertRes.ok) {
      let msg = insertText.slice(0, 200);
      try {
        const j = JSON.parse(insertText) as { message?: string; error?: string };
        msg = j.message || j.error || msg;
      } catch {
        /* use slice */
      }
      if (/expense_reminders|schema cache|does not exist/i.test(msg)) {
        throw new Error(
          "expense_reminders table missing — run supabase/expense-reminders-migration.sql in Supabase."
        );
      }
      if (/foreign key|profiles/i.test(msg)) {
        throw new Error("Invalid cardholder — pick the employee from the Cardholder dropdown.");
      }
      throw new Error(msg || "Could not save expense reminder.");
    }
    const inserted = JSON.parse(insertText) as { id?: string } | Array<{ id?: string }>;
    reminderId = Array.isArray(inserted) ? inserted[0]?.id ?? null : inserted?.id ?? null;
    if (!reminderId) throw new Error("Reminder saved but no id returned.");
  }

  if (alreadyNotified && !forceNotify) {
    return new Response(
      JSON.stringify({ ok: true, reminderId, sent: 0, pushWarning: null, success: true, skipped: true }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  let sent = 0;
  let pushWarning: string | null = null;

  try {
    const pushRes = await fetch(`${baseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "missing_expense_service",
        forceNotify,
        reminderId,
        userId,
        merchant,
        amount,
        expenseDate,
        note: pushNote,
      }),
    });
    const pushText = await pushRes.text();
    let pushJson: { error?: string; sent?: number; pushWarning?: string | null } = {};
    try {
      pushJson = pushText ? JSON.parse(pushText) : {};
    } catch {
      throw new Error(pushText.slice(0, 200) || "Push failed");
    }
    if (!pushRes.ok || pushJson.error) {
      throw new Error(String(pushJson.error || "Push failed"));
    }
    sent = Number(pushJson.sent) || 0;
    pushWarning = pushJson.pushWarning ?? null;
  } catch (err) {
    pushWarning =
      (err as Error).message +
      " Reminder was saved — employee can still see it in the app Notifications tab.";
  }

  return new Response(
    JSON.stringify({ ok: true, reminderId, sent, pushWarning, success: true }),
    { headers: { ...cors, "Content-Type": "application/json" } }
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const body = await req.json();

    if (body.mode === "reconcile_items") {
      return await fetchReconcileItems(body);
    }

    if (body.mode === "flag_missing_expense") {
      return await flagMissingExpense(body);
    }

    if (body.mode === "list_flagged_pending") {
      return await listFlaggedPending();
    }

    if (body.mode === "list_flagged_confirmed") {
      return await listFlaggedConfirmed();
    }

    if (body.mode === "confirm_flagged_reminder") {
      return await confirmFlaggedReminder(body);
    }

    if (body.mode === "dismiss_flagged_reminder") {
      return await dismissFlaggedReminder(body);
    }

    const { fileBase64, mimeType, fileName, storagePath, pageImages, statementText, targetTotal } = body;

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

    const targetHint =
      targetTotal != null && Number.isFinite(Number(targetTotal)) ? roundMoney(Number(targetTotal)) : null;

    if (pdfText.trim().length > 200) {
      const deterministic = attachChaseTotals(parseChaseStatementText(pdfText), pdfText);
      if (deterministic.transactions.length) {
        candidates.push({ data: deterministic, source: "pdf_text" });
      }

      if (
        deterministic.transactions.length < 15 ||
        parseQuality(deterministic.transactions, deterministic, targetHint) < 0.75
      ) {
        try {
          const aiParsed = await callOpenAI(
            defaultModel,
            TEXT_PROMPT + pdfText.slice(0, 120000),
            12000
          );
          candidates.push({
            data: attachChaseTotals(aiParsedToStatement(aiParsed, deterministic), pdfText),
            source: "pdf_ai",
          });
        } catch {
          /* AI text fallback optional */
        }
      }
    }

    if (pageImages?.length) {
      const visionMerged = attachChaseTotals(
        await parseVisionPages((pageImages as string[]).slice(0, 20), visionModel),
        pdfText
      );
      candidates.push({ data: visionMerged, source: "pdf_vision" });
    }

    if (candidates.length > 1) {
      candidates.push({
        data: attachChaseTotals(mergeCandidateStatements(candidates), pdfText),
        source: "pdf_merged",
      });
    }

    const statementTotalHint =
      targetHint ??
      candidates.find((c) => c.data.purchases_total != null)?.data.purchases_total ??
      candidates.find((c) => c.data.statement_total != null)?.data.statement_total ??
      null;

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

    let { period_start, period_end, statement_total, purchases_total, new_balance, transactions } = best.data;
    if (!purchases_total && statementTotalHint) purchases_total = statementTotalHint;
    if (!statement_total) statement_total = purchases_total ?? new_balance ?? statementTotalHint;

    const reconcileTarget = targetHint ?? purchases_total ?? statement_total;
    const period = { start: period_start, end: period_end };
    transactions = normalizeParsedTransactions(transactions, period);
    const accuracy = accuracyReconcile(transactions, reconcileTarget);
    transactions = accuracy.transactions;

    const parsed_sum = accuracy.parsed_sum;
    const parse_warning = buildParseWarning(
      transactions,
      reconcileTarget,
      purchases_total,
      new_balance
    );

    return new Response(
      JSON.stringify({
        ok: true,
        period_start,
        period_end,
        statement_total: reconcileTarget ?? statement_total,
        purchases_total,
        new_balance,
        parsed_sum,
        parse_warning,
        parse_accuracy: {
          matched: accuracy.matched,
          gap: accuracy.gap,
          target_total: reconcileTarget,
          removed_count: accuracy.removed.length,
          parse_source: best.source,
          candidates: candidates.map((c) => c.source),
        },
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
