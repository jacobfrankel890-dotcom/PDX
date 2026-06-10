/**
 * WIX SETUP:
 * 1. In sidebar: Backend → click the + button → "Expose site API"
 *    (This creates http-functions.js — there is NO separate HTTP Functions folder)
 * 2. Paste this entire file into that http-functions.js
 * 3. DELETE pdx-api.js from Public if you put it there
 *
 * Test URL: https://yoursite.com/_functions/pdxApi?action=ping
 */
import { handlePdxAdminRequest, getCreditCardBillCsvBody, getCreditCardBillXlsBody } from "backend/pdx-admin";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body, status = 200) {
  return {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function fileResponse(body, filename, contentType) {
  return {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
    body,
  };
}

/** DEV MODE: no auth. Re-enable before production. */
export async function get_pdxApi(request) {
  if (request.method === "OPTIONS") return { status: 204, headers: cors };
  try {
    const q = request.query || {};
    const action = q.action;

    if (action === "exportBill" || action === "exportBillCsv") {
      if (!q.dateFrom || !q.dateTo) {
        return { status: 400, headers: { "Content-Type": "text/plain" }, body: "Missing dateFrom or dateTo" };
      }
      const csv = await getCreditCardBillCsvBody(
        q.dateFrom,
        q.dateTo,
        q.employeeId || null,
        q.statementTotal || null
      );
      const hint = (q.filenameHint || "export").replace(/[^\w.-]+/g, "_").slice(0, 40);
      const filename = `credit_card_bill_${hint}_${q.dateFrom}_${q.dateTo}.csv`;
      return fileResponse(csv, filename, "text/csv; charset=utf-8");
    }

    if (action === "exportBillXls") {
      if (!q.dateFrom || !q.dateTo) {
        return { status: 400, headers: { "Content-Type": "text/plain" }, body: "Missing dateFrom or dateTo" };
      }
      const xls = await getCreditCardBillXlsBody(
        q.dateFrom,
        q.dateTo,
        q.employeeId || null,
        q.statementTotal || null
      );
      const hint = (q.filenameHint || "export").replace(/[^\w.-]+/g, "_").slice(0, 40);
      const filename = `credit_card_bill_${hint}_${q.dateFrom}_${q.dateTo}.xls`;
      return fileResponse(xls, filename, "application/vnd.ms-excel");
    }

    if (action) {
      const data = await handlePdxAdminRequest(action, q);
      return jsonResponse({ ok: true, data });
    }

    return jsonResponse({ ok: false, error: "Missing action" }, 400);
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, 500);
  }
}

export async function post_pdxApi(request) {
  if (request.method === "OPTIONS") return { status: 204, headers: cors };
  try {
    const body = await request.body.text();
    const payload = body ? JSON.parse(body) : {};
    if (!payload.action) {
      return jsonResponse({ ok: false, error: "Missing action" }, 400);
    }
    const data = await handlePdxAdminRequest(payload.action, payload);
    return jsonResponse({ ok: true, data });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, 500);
  }
}

export async function options_pdxApi() {
  return { status: 204, headers: cors };
}
