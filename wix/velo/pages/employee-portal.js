/**
 * WIX: Employee PAGE code (Page panel → code icon on Employee/Home page)
 * HtmlComponent Velo ID must be: pdxEmployeeEmbed
 */

import {
  pingDatabase,
  getDashboardStats,
  listRecentExpenses,
  listReports,
  listEmployees,
} from "backend/pdx-admin";

const EMBED_ID = "#pdxEmployeeEmbed";

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
  if (typeof raw.type === "string") return raw;
  if (raw.requestId && raw.action) return raw;
  const keys = ["data", "message", "payload", "body"];
  for (let i = 0; i < keys.length; i++) {
    const inner = raw[keys[i]];
    if (inner && typeof inner === "object") {
      if (typeof inner.type === "string" || (inner.requestId && inner.action)) return inner;
    }
  }
  return null;
}

function postToEmbed(embed, payload) {
  try {
    embed.postMessage(payload);
    embed.postMessage(JSON.stringify(payload));
  } catch (_) {}
}

async function runAction(action, msg) {
  switch (action) {
    case "ping": return pingDatabase();
    case "stats": return getDashboardStats();
    case "listRecentExpenses": return listRecentExpenses(msg.limit || 100);
    case "listReports": return listReports(msg.payPeriodStart, msg.payPeriodEnd);
    case "listEmployees": return listEmployees(msg.region);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

$w.onReady(function () {
  let embed;
  try {
    embed = $w(EMBED_ID);
  } catch (_) {
    return;
  }

  const onMsg = async (raw) => {
    const msg = parseEmbedMessage(raw);
    if (!msg) return;

    if (msg.type === "ready") {
      postToEmbed(embed, { type: "pdx-connected" });
      return;
    }

    if (!msg.requestId || !msg.action) return;

    try {
      const data = await runAction(msg.action, msg);
      postToEmbed(embed, { requestId: msg.requestId, ok: true, data });
    } catch (err) {
      postToEmbed(embed, { requestId: msg.requestId, ok: false, error: err.message || "Request failed" });
    }
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

  postToEmbed(embed, { type: "pdx-connected" });
});
