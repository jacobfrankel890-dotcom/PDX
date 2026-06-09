/**
 * Wix page code — Employee Portal
 *
 * Setup:
 * 1. Create a Wix page (e.g. /employee-expenses)
 * 2. Add an HTML iframe / Custom Element, set ID to #pdxEmployeeEmbed
 * 3. Paste wix/embeds/employee-portal.html into the HTML component
 * 4. Paste this file into the page's Page Code panel
 * 5. Add Wix Secrets (see wix/README.md)
 *
 * NOTE: Do NOT import wix-secrets-backend here — use backend/supabase-client.jsw
 */

import { getPublicConfig } from "backend/supabase-client";

const EMBED_ID = "#pdxEmployeeEmbed";

$w.onReady(async function () {
  const embed = $w(EMBED_ID);
  const { supabaseUrl, supabaseAnonKey } = await getPublicConfig();

  embed.onMessage(async (event) => {
    const data = event.data;
    if (!data || !data.type) return;

    if (data.type === "ready") {
      embed.postMessage({
        type: "config",
        supabaseUrl,
        supabaseAnonKey,
      });
    }
  });

  embed.postMessage({
    type: "config",
    supabaseUrl,
    supabaseAnonKey,
  });
});
