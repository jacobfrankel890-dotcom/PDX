/**
 * WIX: Admin PAGE code (Page panel → code icon on Admin page)
 * HtmlComponent Velo ID must be: pdxAdminEmbed
 *
 * REQUIRED for Excel export (iframe sandbox blocks downloads):
 * Add a Link element to this page with ID: pdxExportDownloadLink
 * (can be hidden / 1px — page code clicks it when you press Export .xls in the embed)
 */

import wixLocation from "wix-location";
import {
  pingDatabase,
  getDashboardStats,
  listRecentExpenses,
  listPendingReports,
  listReports,
  getReportLineItems,
  getReportReview,
  approveReport,
  rejectReport,
  listEmployees,
  getRegionSummary,
  exportExpenseData,
  exportCreditCardBill,
  getCreditCardBillDownloadUrls,
} from "backend/pdx-admin";

const EMBED_ID = "#pdxAdminEmbed";
const EXPORT_LINK_ID = "#pdxExportDownloadLink";
const exportHttpBase = `${wixLocation.baseUrl}/_functions/pdxApi`;

async function runAdminAction(action, msg) {
  switch (action) {
    case "ping": return pingDatabase();
    case "stats": return getDashboardStats();
    case "listRecentExpenses": return listRecentExpenses(msg.limit);
    case "listPending": return listPendingReports();
    case "listReports": return listReports(msg.payPeriodStart, msg.payPeriodEnd);
    case "getLineItems": return getReportLineItems(msg.reportId);
    case "getReportReview": return getReportReview(msg.reportId);
    case "approve": return approveReport(msg.reportId, msg.approverName);
    case "reject": return rejectReport(msg.reportId, msg.reason);
    case "listEmployees": return listEmployees(msg.region);
    case "regionSummary": return getRegionSummary(msg.payPeriodStart, msg.payPeriodEnd);
    case "export": return exportExpenseData(msg.payPeriodStart, msg.payPeriodEnd);
    case "exportCreditCardBill":
      return exportCreditCardBill(msg.dateFrom, msg.dateTo, msg.employeeId, msg.statementTotal);
    case "getExportDownloadUrls":
      return getCreditCardBillDownloadUrls(msg.dateFrom, msg.dateTo, msg.employeeId, msg.statementTotal);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

function parseEmbedMessage(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }
  if (typeof raw !== "object") return null;

  function pick(obj) {
    if (!obj || typeof obj !== "object") return null;
    if (typeof obj.type === "string") return obj;
    if (obj.requestId && obj.action) return obj;
    return null;
  }

  const direct = pick(raw);
  if (direct) return direct;

  const keys = ["data", "message", "payload", "body"];
  for (let i = 0; i < keys.length; i++) {
    const inner = pick(raw[keys[i]]);
    if (inner) return inner;
  }
  return null;
}

function postToEmbed(embed, payload) {
  try {
    embed.postMessage(payload);
    embed.postMessage(JSON.stringify(payload));
  } catch (_) {}
}

function openExportUrl(url) {
  try {
    const link = $w(EXPORT_LINK_ID);
    link.link = url;
    link.target = "_blank";
    link.show();
    link.click();
    return "link";
  } catch (_) {
    wixLocation.to(url);
    return "location";
  }
}

async function handleExportXls(msg, embed) {
  try {
    const links = await getCreditCardBillDownloadUrls(
      msg.dateFrom,
      msg.dateTo,
      msg.employeeId || null,
      msg.statementTotal || null
    );
    const mode = openExportUrl(links.xlsUrl);
    postToEmbed(embed, {
      type: "pdx-save-result",
      ok: true,
      filename: links.filename,
      mode,
    });
  } catch (err) {
    postToEmbed(embed, {
      type: "pdx-save-result",
      ok: false,
      filename: msg.filenameHint || "",
      error:
        String(err.message || err) +
        " — Run supabase/exports-bucket-migration.sql and add Link #pdxExportDownloadLink to this page.",
    });
  }
}

async function handleEmbedMessage(msg, embed) {
  if (!msg) return false;

  if (msg.type === "ready") {
    postToEmbed(embed, { type: "pdx-connected", exportHttpBase });
    return true;
  }

  if (msg.type === "pdx-export-xls") {
    await handleExportXls(msg, embed);
    return true;
  }

  if (msg.type === "pdx-download" && msg.url) {
    openExportUrl(msg.url);
    postToEmbed(embed, { type: "pdx-save-result", ok: true, filename: msg.filename });
    return true;
  }

  if (!msg.requestId || !msg.action) return false;

  try {
    const data = await runAdminAction(msg.action, msg);
    postToEmbed(embed, { requestId: msg.requestId, ok: true, data });
  } catch (err) {
    postToEmbed(embed, { requestId: msg.requestId, ok: false, error: err.message || "Request failed" });
  }
  return true;
}

$w.onReady(function () {
  let embed;
  try {
    embed = $w(EMBED_ID);
  } catch (_) {
    return;
  }

  const onMsg = (raw) => {
    handleEmbedMessage(parseEmbedMessage(raw), embed);
  };

  embed.onMessage((event) => {
    const raw =
      event && typeof event === "object" && Object.prototype.hasOwnProperty.call(event, "data")
        ? event.data
        : event;
    onMsg(raw);
  });

  try {
    window.addEventListener("message", (ev) => onMsg(ev.data));
  } catch (_) {}

  embed.postMessage({ type: "pdx-connected", exportHttpBase });
  embed.postMessage(JSON.stringify({ type: "pdx-connected", exportHttpBase }));
});
