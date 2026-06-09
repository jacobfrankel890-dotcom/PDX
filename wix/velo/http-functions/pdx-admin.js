import {
  listPendingReports,
  approveReport,
  rejectReport,
  exportExpenseData,
  pingDatabase,
} from "backend/pdx-admin";
import { verifyAdminAccessToken } from "backend/supabase-client";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

function jsonResponse(body, status = 200) {
  return {
    status,
    headers: cors,
    body: JSON.stringify(body),
  };
}

function getBearerToken(request) {
  const auth = request.headers?.authorization || request.headers?.Authorization || "";
  if (auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return null;
}

/**
 * GET /_functions/pdxAdmin?action=ping
 * GET /_functions/pdxAdmin?action=pending  (Authorization: Bearer <supabase_jwt>)
 * POST /_functions/pdxAdmin  { action, reportId, ... }
 */
export async function get_pdxAdmin(request) {
  if (request.method === "OPTIONS") {
    return { status: 204, headers: cors };
  }

  try {
    const action = request.query?.action;

    if (action === "ping") {
      const result = await pingDatabase();
      return jsonResponse(result);
    }

    const token = getBearerToken(request);
    await verifyAdminAccessToken(token);

    if (action === "pending") {
      const data = await listPendingReports(token);
      return jsonResponse({ ok: true, data });
    }

    return jsonResponse({ ok: false, error: "Unknown action" }, 400);
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, err.message.includes("admin") ? 403 : 401);
  }
}

export async function post_pdxAdmin(request) {
  if (request.method === "OPTIONS") {
    return { status: 204, headers: cors };
  }

  try {
    const body = await request.body.text();
    const payload = body ? JSON.parse(body) : {};
    const token = getBearerToken(request) || payload.accessToken;

    await verifyAdminAccessToken(token);

    let data;

    switch (payload.action) {
      case "approve":
        data = await approveReport(token, payload.reportId, payload.approverName);
        break;
      case "reject":
        data = await rejectReport(token, payload.reportId, payload.reason);
        break;
      case "export":
        data = await exportExpenseData(token, payload.payPeriodStart, payload.payPeriodEnd);
        break;
      case "pending":
        data = await listPendingReports(token);
        break;
      default:
        return jsonResponse({ ok: false, error: "Unknown action" }, 400);
    }

    return jsonResponse({ ok: true, data });
  } catch (err) {
    const status = err.message.includes("admin") ? 403 : 401;
    return jsonResponse({ ok: false, error: err.message }, status);
  }
}

export async function options_pdxAdmin() {
  return { status: 204, headers: cors };
}
