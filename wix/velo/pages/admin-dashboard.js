/**
 * Wix page code — Admin Dashboard
 *
 * Setup:
 * 1. Create a members-only or password-protected Wix page (e.g. /expense-admin)
 * 2. Add an HTML iframe / Custom Element, set ID to #pdxAdminEmbed
 * 3. Paste wix/embeds/admin-dashboard.html into the HTML component
 * 4. Paste this file into the page's Page Code panel
 *
 * NOTE: Do NOT import wix-secrets-backend here — use backend/supabase-client.jsw
 */

import { getPublicConfig } from "backend/supabase-client";
import {
  listPendingReports,
  listReports,
  getReportLineItems,
  approveReport,
  rejectReport,
  listEmployees,
  getRegionSummary,
  exportExpenseData,
} from "backend/pdx-admin";

const EMBED_ID = "#pdxAdminEmbed";

$w.onReady(async function () {
  const embed = $w(EMBED_ID);
  const { supabaseUrl, supabaseAnonKey } = await getPublicConfig();

  embed.onMessage(async (event) => {
    const msg = event.data;
    if (!msg || !msg.requestId || !msg.action) return;

    const reply = (payload) =>
      embed.postMessage({ requestId: msg.requestId, ...payload });

    try {
      if (msg.action === "config") {
        return reply({
          ok: true,
          data: { supabaseUrl, supabaseAnonKey },
        });
      }

      const token = msg.accessToken;
      if (!token) {
        return reply({ ok: false, error: "Not signed in" });
      }

      let data;

      switch (msg.action) {
        case "listPending":
          data = await listPendingReports(token);
          break;
        case "listReports":
          data = await listReports(token, msg.payPeriodStart, msg.payPeriodEnd);
          break;
        case "getLineItems":
          data = await getReportLineItems(token, msg.reportId);
          break;
        case "approve":
          data = await approveReport(token, msg.reportId, msg.approverName);
          break;
        case "reject":
          data = await rejectReport(token, msg.reportId, msg.reason);
          break;
        case "listEmployees":
          data = await listEmployees(token, msg.region);
          break;
        case "regionSummary":
          data = await getRegionSummary(token, msg.payPeriodStart, msg.payPeriodEnd);
          break;
        case "export":
          data = await exportExpenseData(token, msg.payPeriodStart, msg.payPeriodEnd);
          break;
        default:
          return reply({ ok: false, error: `Unknown action: ${msg.action}` });
      }

      reply({ ok: true, data });
    } catch (err) {
      reply({ ok: false, error: err.message || "Request failed" });
    }
  });

  embed.postMessage({
    type: "init",
    supabaseUrl,
    supabaseAnonKey,
  });
});
