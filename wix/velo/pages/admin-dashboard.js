/**
 * Admin page — HTML element ID: pdxAdminEmbed
 */

import wixLocation from "wix-location";
import wixWindow from "wix-window";
import { handlePdxAdminRequest } from "backend/pdx-admin";

const EMBED_ID = "#pdxAdminEmbed";
const siteBase = wixLocation.baseUrl;
const exportHttpBase = `${siteBase}/_functions/pdxAdmin`;

function saveFileFromBase64(base64, filename, mimeType) {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    const root = document.body || document.documentElement;
    root.appendChild(link);
    link.click();
    root.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (_) {
    return false;
  }
}

function sendConnected(embed) {
  embed.postMessage({ type: "pdx-connected", exportHttpBase, siteBase });
}

$w.onReady(function () {
  const embed = $w(EMBED_ID);

  embed.onMessage(async (event) => {
    const msg = event.data;
    if (msg?.type === "ready") {
      sendConnected(embed);
      return;
    }

    if (msg?.type === "pdx-save-file" && msg.base64 && msg.filename) {
      const mime = msg.mimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const ok = saveFileFromBase64(msg.base64, msg.filename, mime);
      embed.postMessage({ type: "pdx-save-result", ok, filename: msg.filename });
      if (!ok && msg.httpFallback) {
        wixWindow.open(msg.httpFallback, "_blank");
      }
      return;
    }

    if (!msg?.requestId || !msg?.action) return;

    const reply = (payload) =>
      embed.postMessage({ requestId: msg.requestId, ...payload });

    try {
      const data = await handlePdxAdminRequest(msg.action, msg);
      reply({ ok: true, data });
    } catch (err) {
      reply({ ok: false, error: err.message || "Request failed" });
    }
  });

  sendConnected(embed);
});
