/**
 * Home / Employee page — HTML element ID: pdxEmployeeEmbed
 * DEV MODE: no sign-in. Data flows via Velo service role.
 */

import { handlePdxAdminRequest } from "backend/pdx-admin";

const EMBED_ID = "#pdxEmployeeEmbed";

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
      const data = await handlePdxAdminRequest(msg.action, msg);
      reply({ ok: true, data });
    } catch (err) {
      reply({ ok: false, error: err.message || "Request failed" });
    }
  });

  embed.postMessage({ type: "pdx-connected" });
});
