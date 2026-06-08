import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { phone } = await req.json();
    if (!phone) throw new Error("Phone required");

    const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const token = Deno.env.get("TWILIO_AUTH_TOKEN");
    const verifySid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

    if (!sid || !token || !verifySid) {
      return new Response(JSON.stringify({ success: true, devMode: true, message: "Dev mode" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const auth = btoa(`${sid}:${token}`);
    const res = await fetch(`https://verify.twilio.com/v2/Services/${verifySid}/Verifications`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, Channel: "sms" }),
    });

    if (!res.ok) throw new Error("Failed to send verification code");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
