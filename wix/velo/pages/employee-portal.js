/**
 * WIX: Employee PAGE code (Page panel → code icon on Employee/Home page)
 * HtmlComponent Velo ID must be: pdxEmployeeEmbed
 *
 * Sends Supabase public config only — the embed talks to Supabase directly (RLS).
 */

import { getPublicConfig } from "backend/supabase-client";

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
  const keys = ["data", "message", "payload", "body"];
  for (let i = 0; i < keys.length; i++) {
    const inner = raw[keys[i]];
    if (inner && typeof inner === "object" && typeof inner.type === "string") return inner;
  }
  return null;
}

function postToEmbed(embed, payload) {
  try {
    embed.postMessage(JSON.stringify(payload));
  } catch (_) {}
}

$w.onReady(async function () {
  let embed;
  try {
    embed = $w(EMBED_ID);
  } catch (_) {
    return;
  }

  let config = null;
  try {
    config = await getPublicConfig();
  } catch (_) {
    /* embed uses hardcoded fallback */
  }

  const onMsg = (raw) => {
    const msg = parseEmbedMessage(raw);
    if (!msg || msg.type !== "ready") return;
    postToEmbed(embed, {
      type: "pdx-config",
      supabaseUrl: config?.supabaseUrl,
      supabaseAnonKey: config?.supabaseAnonKey,
    });
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

  postToEmbed(embed, {
    type: "pdx-config",
    supabaseUrl: config?.supabaseUrl,
    supabaseAnonKey: config?.supabaseAnonKey,
  });
});
