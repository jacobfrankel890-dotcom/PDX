/**
 * WIX: Employee PAGE code (Page panel → code icon on Employee/Home page)
 * HTML embed element ID must be: pdxEmployeeEmbed
 */

import {
  pingDatabase,
  getDashboardStats,
  listRecentExpenses,
  listPendingReports,
  listReports,
  getReportLineItems,
  approveReport,
  rejectReport,
  listEmployees,
  getRegionSummary,
  exportExpenseData,
} from "backend/pdx-admin";

const EMBED_ID = "#pdxEmployeeEmbed";

async function runAdminAction(action, msg) {
  switch (action) {
    case "ping": return pingDatabase();
    case "stats": return getDashboardStats();
    case "listRecentExpenses": return listRecentExpenses(msg.limit);
    case "listPending": return listPendingReports();
    case "listReports": return listReports(msg.payPeriodStart, msg.payPeriodEnd);
    case "getLineItems": return getReportLineItems(msg.reportId);
    case "approve": return approveReport(msg.reportId, msg.approverName);
    case "reject": return rejectReport(msg.reportId, msg.reason);
    case "listEmployees": return listEmployees(msg.region);
    case "regionSummary": return getRegionSummary(msg.payPeriodStart, msg.payPeriodEnd);
    case "export": return exportExpenseData(msg.payPeriodStart, msg.payPeriodEnd);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

$w.onReady(function () {
  const embed = $w(EMBED_ID);

  embed.onMessage(async (event) => {
    const msg = event.data;
    if (msg?.type === "ready") {
      embed.postMessage({ type: "pdx-connected" });
      return;
    }
    if (!msg?.requestId || !msg?.action) return;

    const reply = (payload) =>
      embed.postMessage({ requestId: msg.requestId, ...payload });

    try {
      const data = await runAdminAction(msg.action, msg);
      reply({ ok: true, data });
    } catch (err) {
      reply({ ok: false, error: err.message || "Request failed" });
    }
  });

  embed.postMessage({ type: "pdx-connected" });
});
