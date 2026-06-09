import {
  listPendingReports,
  approveReport,
  rejectReport,
  exportExpenseData,
  pingDatabase,
  getCreditCardBillCsvBody,
} from "backend/pdx-admin";

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
export async function get_pdxAdmin(request) {
  if (request.method === "OPTIONS") return { status: 204, headers: cors };
  try {
    const q = request.query || {};
    const action = q.action;

    if (action === "ping") return jsonResponse(await pingDatabase());
    if (action === "pending") return jsonResponse({ ok: true, data: await listPendingReports() });

    if (action === "exportBill") {
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

    return jsonResponse({ ok: false, error: "Unknown action" }, 400);
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, 500);
  }
}

export async function post_pdxAdmin(request) {
  if (request.method === "OPTIONS") return { status: 204, headers: cors };
  try {
    const body = await request.body.text();
    const payload = body ? JSON.parse(body) : {};
    let data;
    switch (payload.action) {
      case "approve": data = await approveReport(payload.reportId, payload.approverName); break;
      case "reject": data = await rejectReport(payload.reportId, payload.reason); break;
      case "export": data = await exportExpenseData(payload.payPeriodStart, payload.payPeriodEnd); break;
      case "pending": data = await listPendingReports(); break;
      default: return jsonResponse({ ok: false, error: "Unknown action" }, 400);
    }
    return jsonResponse({ ok: true, data });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, 500);
  }
}

export async function options_pdxAdmin() {
  return { status: 204, headers: cors };
}
