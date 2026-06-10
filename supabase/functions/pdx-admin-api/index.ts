import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROFILE_FIELDS =
  "id,first_name,last_name,email,phone,role,region,company,card_type,created_at";

const REPORT_SELECT =
  "id,user_id,pay_period_start,pay_period_end,status,grand_total,submitted_at,approved_at,approved_by,total_travel_lodging,total_tolls_parking,total_miles,total_mileage_calc,total_office_supplies,total_meals_entertainment,total_vehicle_maintenance,total_marketing,total_misc";

const EXPORT_CATEGORIES = [
  { key: "travel_lodging", label: "TRV / LOD" },
  { key: "tolls_parking", label: "Toll/Parking" },
  { key: "office_supplies", label: "OFF. SUP & EQP" },
  { key: "meals_entertainment", label: "Meals & Enter." },
  { key: "vehicle_maintenance", label: "Cell & / M" },
  { key: "marketing", label: "Marketing" },
  { key: "misc", label: "Misc." },
  { key: "mileage_calc", label: "Mileage" },
];

const COMPANIES = [
  { value: "cpx", label: "CPX — Canada" },
  { value: "pdx_north", label: "PDX North — Northeast US" },
  { value: "apx", label: "APX — Auto Parts Xpress" },
  { value: "pdx", label: "PDX — Parts Distribution Xpress" },
  { value: "pdx_south", label: "PDX South — Southeast US" },
  { value: "pdx_west", label: "PDX West — Northwest US" },
  { value: "apx_california", label: "APX California — Southwest US / California" },
];

const LEGACY_COMPANY: Record<string, string> = {
  "Parts Distribution Xpress": "pdx",
  "All Parts Xpress": "apx",
  "Auto Parts Xpress": "apx",
  CPX: "cpx",
};

function jsonOk(data: unknown, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ ok: true, data, ...extra }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function jsonErr(message: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function supabaseQuery(path: string, init?: RequestInit) {
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

function ccNormalizeCompanyKey(company: string | null | undefined, region: string | null | undefined) {
  if (!company) return region || "";
  if (COMPANIES.some((c) => c.value === company)) return company;
  if (LEGACY_COMPANY[company]) return LEGACY_COMPANY[company];
  if (COMPANIES.some((c) => c.value === region)) return region;
  return company;
}

function ccCompanyShortLabel(company: string | null | undefined, region: string | null | undefined) {
  const key = ccNormalizeCompanyKey(company, region);
  const match = COMPANIES.find((c) => c.value === key);
  const full = match ? match.label : company || region || "—";
  const sep = full.indexOf(" — ");
  return sep >= 0 ? full.slice(sep + 3) : full;
}

function ccInitials(firstName?: string | null, lastName?: string | null) {
  const f = (firstName || "").trim()[0] || "";
  const l = (lastName || "").trim()[0] || "";
  return (f + l).toUpperCase() || "—";
}

function ccFormatUsDate(isoDate: string | null | undefined) {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T12:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function ccRound2(n: unknown) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function ccEmptyCategoryRow() {
  const row: Record<string, number> = {};
  for (const { key } of EXPORT_CATEGORIES) row[key] = 0;
  return row;
}

function ccCategoryAmounts(item: Record<string, unknown>) {
  const amounts: Record<string, number> = {};
  for (const { key } of EXPORT_CATEGORIES) amounts[key] = ccRound2(item[key] || 0);
  return amounts;
}

function buildCreditCardBillExport({
  items,
  employeeFilter,
  dateFrom,
  dateTo,
  statementTotal,
}: {
  items: Record<string, unknown>[];
  employeeFilter: string | null;
  dateFrom: string;
  dateTo: string;
  statementTotal: unknown;
}) {
  let filtered = items || [];
  if (employeeFilter) filtered = filtered.filter((row) => row.user_id === employeeFilter);
  if (dateFrom) filtered = filtered.filter((row) => row.expense_date && String(row.expense_date) >= dateFrom);
  if (dateTo) filtered = filtered.filter((row) => row.expense_date && String(row.expense_date) <= dateTo);

  filtered.sort((a, b) => {
    const da = String(a.expense_date || "");
    const db = String(b.expense_date || "");
    return da !== db ? da.localeCompare(db) : String(a.description || "").localeCompare(String(b.description || ""));
  });

  const categoryTotals = ccEmptyCategoryRow();
  const rows = [];

  for (const item of filtered) {
    const profile = (item.profile || {}) as Record<string, unknown>;
    const amounts = ccCategoryAmounts(item);
    const rowTotal = ccRound2(item.row_total || Object.values(amounts).reduce((s, v) => s + v, 0));
    for (const { key } of EXPORT_CATEGORIES) categoryTotals[key] = ccRound2(categoryTotals[key] + amounts[key]);
    rows.push({
      date: ccFormatUsDate(String(item.expense_date || "")),
      vendor: item.description || "—",
      employee_initials: ccInitials(profile.first_name as string, profile.last_name as string),
      employee_name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
      company: ccCompanyShortLabel(
        (item.company as string) || (profile.company as string),
        profile.region as string
      ),
      description: item.related_to || "",
      amounts,
      total: rowTotal,
    });
  }

  const grandTotal = ccRound2(Object.values(categoryTotals).reduce((s, v) => s + v, 0));
  const billTotal = statementTotal != null && statementTotal !== "" ? ccRound2(Number(statementTotal)) : null;

  return {
    header: {
      title: "Credit Card Bill",
      employee_name: employeeFilter && filtered[0]?.profile
        ? `${(filtered[0].profile as Record<string, unknown>).first_name || ""} ${(filtered[0].profile as Record<string, unknown>).last_name || ""}`.trim()
        : rows.length ? [...new Set(rows.map((r) => r.employee_name))].join(", ") : "All employees",
      date_from: ccFormatUsDate(dateFrom),
      date_to: ccFormatUsDate(dateTo),
      spreadsheet_total: grandTotal,
      statement_total: billTotal,
      difference: billTotal != null ? ccRound2(grandTotal - billTotal) : null,
      line_count: rows.length,
    },
    category_keys: EXPORT_CATEGORIES.map((c) => c.key),
    category_totals: categoryTotals,
    rows,
    grand_total: grandTotal,
  };
}

function ccCsvCell(value: unknown) {
  if (value == null || value === "") return "";
  const s = String(value);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

function ccFormatMoneyCsv(n: unknown) {
  if (n == null || n === "" || Number(n) === 0) return "";
  const num = ccRound2(n);
  return num < 0 ? `"(${Math.abs(num).toFixed(2)})"` : num.toFixed(2);
}

function creditCardBillToCsv(exportData: ReturnType<typeof buildCreditCardBillExport>) {
  const { header, rows, category_keys, category_totals, grand_total } = exportData;
  const catLabels = EXPORT_CATEGORIES.map((c) => c.label);
  const lines: string[] = [];
  lines.push(ccCsvCell(header.title));
  lines.push(["Employee", header.employee_name, "", "", "", "From:", header.date_from, "", "To:", header.date_to].map(ccCsvCell).join(","));
  lines.push(["", "", "", "", "", "Total per Spreadsheet:", ccFormatMoneyCsv(header.spreadsheet_total), "", "Total on bill:", header.statement_total != null ? ccFormatMoneyCsv(header.statement_total) : "", "", "Difference:", header.difference != null ? ccFormatMoneyCsv(header.difference) : ""].map(ccCsvCell).join(","));
  lines.push("");
  lines.push(["Date", "Vendor", "Employee", "Company", "Description", ...catLabels, "Total"].map(ccCsvCell).join(","));
  for (const row of rows) {
    lines.push([row.date, row.vendor, row.employee_initials, row.company, row.description, ...category_keys.map((k) => ccFormatMoneyCsv(row.amounts[k])), ccFormatMoneyCsv(row.total)].map(ccCsvCell).join(","));
  }
  lines.push(["Total", "", "", "", "", ...category_keys.map((k) => ccFormatMoneyCsv(category_totals[k])), ccFormatMoneyCsv(grand_total)].map(ccCsvCell).join(","));
  return "\uFEFF" + lines.join("\n");
}

function ccXmlEsc(value: unknown) {
  if (value == null || value === "") return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ccSpreadsheetCell(value: unknown, asNumber: boolean) {
  if (asNumber && value != null && value !== "" && !Number.isNaN(Number(value))) {
    return `<Cell><Data ss:Type="Number">${Number(value)}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${ccXmlEsc(value)}</Data></Cell>`;
}

function ccSpreadsheetRow(values: unknown[], numberIndexes?: Set<number>) {
  const nums = numberIndexes || new Set();
  return `<Row>${values.map((v, i) => ccSpreadsheetCell(v, nums.has(i))).join("")}</Row>`;
}

function creditCardBillToSpreadsheetXml(exportData: ReturnType<typeof buildCreditCardBillExport>) {
  const { header, rows, category_keys, category_totals, grand_total } = exportData;
  const catLabels = EXPORT_CATEGORIES.map((c) => c.label);
  const dataHeaders = ["Date", "Vendor", "Employee", "Company", "Description", ...catLabels, "Total"];
  const moneyIndexes = new Set([5 + catLabels.length]);
  for (let i = 5; i < 5 + catLabels.length; i++) moneyIndexes.add(i);
  const summaryIndexes = new Set([6, 9, 12]);
  const parts = [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    '<Worksheet ss:Name="Credit Card Bill"><Table>',
    ccSpreadsheetRow([header.title]),
    ccSpreadsheetRow(["Employee", header.employee_name, "", "", "", "From:", header.date_from, "", "To:", header.date_to]),
    ccSpreadsheetRow(
      ["", "", "", "", "", "Total per Spreadsheet:", header.spreadsheet_total, "", "Total on bill:", header.statement_total ?? "", "", "Difference:", header.difference ?? ""],
      summaryIndexes
    ),
    ccSpreadsheetRow([""]),
    ccSpreadsheetRow(dataHeaders),
  ];
  for (const row of rows) {
    parts.push(
      ccSpreadsheetRow(
        [row.date, row.vendor, row.employee_initials, row.company, row.description, ...category_keys.map((k) => row.amounts[k] || ""), row.total],
        moneyIndexes
      )
    );
  }
  parts.push(
    ccSpreadsheetRow(["Total", "", "", "", "", ...category_keys.map((k) => category_totals[k]), grand_total], moneyIndexes),
    "</Table></Worksheet></Workbook>"
  );
  return parts.join("\n");
}

function mapReportRow(row: Record<string, unknown>) {
  return {
    ...row,
    employee: row.profiles || null,
    profiles: undefined,
  };
}

async function fetchLineItemsForStatement(dateFrom: string, dateTo: string, employeeId: string | null) {
  let query =
    "expense_line_items?select=*,expense_reports!inner(status,pay_period_start,pay_period_end,user_id,profiles!expense_reports_user_id_fkey(id,first_name,last_name,email,region,company))&expense_reports.status=in.(submitted,approved)";
  if (dateFrom) query += `&expense_date=gte.${encodeURIComponent(dateFrom)}`;
  if (dateTo) query += `&expense_date=lte.${encodeURIComponent(dateTo)}`;
  if (employeeId) query += `&expense_reports.user_id=eq.${encodeURIComponent(employeeId)}`;
  query += "&order=expense_date.asc,sort_order.asc";

  const items = (await supabaseQuery(query)) as Record<string, unknown>[];
  return (items || []).map((item) => {
    const report = (item.expense_reports || {}) as Record<string, unknown>;
    const profile = (report.profiles || {}) as Record<string, unknown>;
    return {
      ...item,
      user_id: report.user_id,
      report_status: report.status,
      profile,
      expense_reports: undefined,
    };
  });
}

async function getDashboardStats() {
  const [profiles, reports, reminders] = await Promise.all([
    supabaseQuery("profiles?select=id"),
    supabaseQuery("expense_reports?select=status,grand_total"),
    supabaseQuery("expense_reminders?select=status"),
  ]);

  const byStatus: Record<string, number> = { draft: 0, submitted: 0, approved: 0, rejected: 0 };
  let totalExpenses = 0;
  for (const r of reports as Array<{ status: string; grand_total: number }>) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    if (r.status === "submitted" || r.status === "approved") {
      totalExpenses += Number(r.grand_total || 0);
    }
  }

  let flagged_pending_count = 0;
  let flagged_confirmed_count = 0;
  for (const rem of reminders as Array<{ status: string }>) {
    if (rem.status === "confirmed") flagged_confirmed_count += 1;
    else if (["pending", "notified", "no_receipt", "submitted"].includes(rem.status)) {
      flagged_pending_count += 1;
    }
  }

  return {
    employee_count: (profiles as unknown[]).length,
    report_count: (reports as unknown[]).length,
    pending_count: byStatus.submitted || 0,
    approved_count: byStatus.approved || 0,
    draft_count: byStatus.draft || 0,
    total_expenses: totalExpenses,
    flagged_pending_count,
    flagged_confirmed_count,
  };
}

async function listPendingReports() {
  const reports = (await supabaseQuery(
    `expense_reports?status=eq.submitted&select=${REPORT_SELECT},profiles!expense_reports_user_id_fkey(${PROFILE_FIELDS})&order=submitted_at.asc`
  )) as Record<string, unknown>[];
  return (reports || []).map(mapReportRow);
}

async function listEmployees(region?: string | null) {
  let query = `profiles?select=${PROFILE_FIELDS}&order=last_name.asc,first_name.asc`;
  if (region) query += `&region=eq.${encodeURIComponent(region)}`;
  return supabaseQuery(query);
}

async function exportCreditCardBill(body: Record<string, unknown>) {
  const dateFrom = body.dateFrom ? String(body.dateFrom).slice(0, 10) : "";
  const dateTo = body.dateTo ? String(body.dateTo).slice(0, 10) : "";
  const employeeId = body.employeeId ? String(body.employeeId) : null;
  const statementTotal = body.statementTotal ?? null;
  if (!dateFrom || !dateTo) throw new Error("Select statement from / to dates.");
  const items = await fetchLineItemsForStatement(dateFrom, dateTo, employeeId);
  return buildCreditCardBillExport({ items, employeeFilter: employeeId, dateFrom, dateTo, statementTotal });
}

function exportFilenameHint(data: ReturnType<typeof buildCreditCardBillExport>) {
  const name = data.header?.employee_name;
  if (name && name !== "All employees") {
    return String(name).replace(/[^\w.-]+/g, "_").slice(0, 40);
  }
  return "All_employees";
}

async function uploadExportFile(body: string, filename: string, contentType: string) {
  const baseUrl = Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const bucket = "exports";
  const path = `admin/${Date.now()}_${filename.replace(/[^\w.-]+/g, "_")}`;
  const encodedPath = path.split("/").map((s) => encodeURIComponent(s)).join("/");

  const uploadRes = await fetch(`${baseUrl}/storage/v1/object/${bucket}/${encodedPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body,
  });
  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(text.slice(0, 200) || "Could not store export file — run exports-bucket migration.");
  }

  const signRes = await fetch(`${baseUrl}/storage/v1/object/sign/${bucket}/${encodedPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: 3600 }),
  });
  const signData = await signRes.json().catch(() => ({}));
  const signed = signData.signedURL || signData.signedUrl;
  if (!signed) throw new Error("Could not create download link.");
  const url = signed.startsWith("http")
    ? signed
    : `${baseUrl}/storage/v1${signed.startsWith("/") ? signed : `/${signed}`}`;
  return { url, filename, path };
}

function withDownloadParam(url: string, filename: string) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}download=${encodeURIComponent(filename)}`;
}

async function getExportDownloadUrls(body: Record<string, unknown>) {
  const dateFrom = body.dateFrom ? String(body.dateFrom).slice(0, 10) : "";
  const dateTo = body.dateTo ? String(body.dateTo).slice(0, 10) : "";
  const employeeId = body.employeeId ? String(body.employeeId) : null;
  const statementTotal = body.statementTotal ?? null;
  if (!dateFrom || !dateTo) throw new Error("Select statement from / to dates.");

  const data = await exportCreditCardBill(body);
  const hint = exportFilenameHint(data);
  const xlsName = `credit_card_bill_${hint}_${dateFrom}_${dateTo}.xls`;
  const csvName = `credit_card_bill_${hint}_${dateFrom}_${dateTo}.csv`;

  const [xls, csv] = await Promise.all([
    uploadExportFile(creditCardBillToSpreadsheetXml(data), xlsName, "application/vnd.ms-excel"),
    uploadExportFile(creditCardBillToCsv(data), csvName, "text/csv; charset=utf-8"),
  ]);

  return {
    filename: xls.filename,
    csvFilename: csv.filename,
    xlsUrl: withDownloadParam(xls.url, xls.filename),
    csvUrl: withDownloadParam(csv.url, csv.filename),
    expiresIn: 3600,
  };
}

function storageBase() {
  return Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "");
}

function storageKey() {
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}

function encodeStoragePath(storagePath: string) {
  return storagePath.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

async function signStorageUrl(bucket: string, path: string): Promise<string | null> {
  if (!path) return null;
  const trimmed = path.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;

  const baseUrl = storageBase();
  const serviceKey = storageKey();
  const res = await fetch(`${baseUrl}/storage/v1/object/sign/${bucket}/${encodeStoragePath(trimmed)}`, {
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

async function prepareStatementUpload(fileName: string) {
  const safe = String(fileName || "statement.pdf").replace(/[^\w.-]+/g, "_").slice(0, 80);
  const storagePath = `uploads/${Date.now()}_${safe}`;
  const baseUrl = storageBase();
  const serviceKey = storageKey();
  const encodedPath = encodeStoragePath(storagePath);

  const res = await fetch(`${baseUrl}/storage/v1/object/upload/sign/statements/${encodedPath}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      "x-upsert": "true",
    },
    body: JSON.stringify({}),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text.slice(0, 160) || "Could not create upload URL");
  }
  if (!res.ok) {
    const hint = /bucket/i.test(text)
      ? " — run supabase/cc-statements-migration.sql in Supabase SQL editor"
      : "";
    throw new Error(String(data.message || data.error || text.slice(0, 160) || "Could not create upload URL") + hint);
  }

  const storageV1 = `${baseUrl}/storage/v1`;
  const relUrl = String(data.url || "");
  let signedUrl = String(data.signedUrl || "");
  let token = String(data.token || "");
  if (!signedUrl && relUrl) {
    signedUrl = relUrl.startsWith("http") ? relUrl : `${storageV1}${relUrl.startsWith("/") ? relUrl : `/${relUrl}`}`;
    try {
      if (!token) token = new URL(signedUrl).searchParams.get("token") || "";
    } catch {
      /* ignore */
    }
  }
  if (!signedUrl) throw new Error("Invalid upload sign response from Supabase");

  return { storagePath, signedUrl, token };
}

async function uploadStatementPdf(fileBase64: string, fileName: string) {
  if (!fileBase64) throw new Error("fileBase64 required");
  const safe = String(fileName || "statement.pdf").replace(/[^\w.-]+/g, "_").slice(0, 80);
  const storagePath = `uploads/${Date.now()}_${safe}`;
  const bytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));

  const baseUrl = storageBase();
  const serviceKey = storageKey();
  const uploadRes = await fetch(`${baseUrl}/storage/v1/object/statements/${encodeStoragePath(storagePath)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/pdf",
      "x-upsert": "true",
    },
    body: bytes,
  });
  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(text.slice(0, 200) || "PDF upload failed");
  }
  return { storagePath };
}

async function getReportLineItems(reportId: string) {
  const items = (await supabaseQuery(
    `expense_line_items?report_id=eq.${encodeURIComponent(reportId)}&select=*&order=sort_order.asc`
  )) as Array<Record<string, unknown>>;

  return Promise.all(
    (items || []).map(async (item) => ({
      ...item,
      receipt_image_url: await signStorageUrl("receipts", String(item.receipt_url || "")),
    }))
  );
}

async function getReportReview(reportId: string) {
  if (!reportId) throw new Error("Missing reportId");
  const lineItems = await getReportLineItems(reportId);
  const uploads = (await supabaseQuery(
    `receipt_uploads?report_id=eq.${encodeURIComponent(reportId)}&select=id,storage_path,file_name,created_at,status&order=created_at.asc`
  )) as Array<Record<string, unknown>>;

  const seenPaths = new Set(lineItems.map((i) => i.receipt_url).filter(Boolean));
  const receiptGallery = [];
  for (const upload of uploads || []) {
    const storagePath = String(upload.storage_path || "");
    if (!storagePath || seenPaths.has(storagePath)) continue;
    receiptGallery.push({
      ...upload,
      receipt_image_url: await signStorageUrl("receipts", storagePath),
    });
  }
  return { line_items: lineItems, receipt_gallery: receiptGallery };
}

async function approveReport(reportId: string, approverName?: string | null) {
  const rows = (await supabaseQuery(
    `expense_reports?id=eq.${encodeURIComponent(reportId)}&status=eq.submitted`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: approverName || "Admin",
      }),
    }
  )) as unknown[];
  if (!rows?.[0]) throw new Error("Report not found or not in submitted status");
  return rows[0];
}

async function rejectReport(reportId: string, reason?: string | null) {
  const rows = (await supabaseQuery(
    `expense_reports?id=eq.${encodeURIComponent(reportId)}&status=eq.submitted`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "rejected",
        notes: reason || null,
      }),
    }
  )) as unknown[];
  if (!rows?.[0]) throw new Error("Report not found or not in submitted status");
  return rows[0];
}

async function pingDatabase() {
  await supabaseQuery("app_settings?key=eq.mileage_rate&select=key,value&limit=1");
  return { ok: true, ts: new Date().toISOString() };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    if (!req.headers.get("Authorization")) throw new Error("Unauthorized");

    const body = await req.json();
    const mode = String(body.mode || "");

    switch (mode) {
      case "dashboard_stats":
        return jsonOk(await getDashboardStats());
      case "list_pending_reports":
        return jsonOk(await listPendingReports());
      case "list_employees":
        return jsonOk(await listEmployees(body.region || null));
      case "export_credit_card_bill":
        return jsonOk(await exportCreditCardBill(body));
      case "get_export_download_urls":
        return jsonOk(await getExportDownloadUrls(body));
      case "prepare_statement_upload":
        return jsonOk(await prepareStatementUpload(String(body.fileName || "statement.pdf")));
      case "upload_statement_pdf":
        return jsonOk(await uploadStatementPdf(String(body.fileBase64 || ""), String(body.fileName || "statement.pdf")));
      case "get_report_review":
        return jsonOk(await getReportReview(String(body.reportId || "")));
      case "approve_report":
        return jsonOk(await approveReport(String(body.reportId || ""), body.approverName ? String(body.approverName) : null));
      case "reject_report":
        return jsonOk(await rejectReport(String(body.reportId || ""), body.reason ? String(body.reason) : null));
      case "ping":
        return jsonOk(await pingDatabase());
      default:
        return jsonErr(`Unknown mode: ${mode}`, 400);
    }
  } catch (err) {
    return jsonErr((err as Error).message || "Request failed", 500);
  }
});
