import { NextResponse } from "next/server";
import { z } from "zod";
import { getTwilioClient, getVerifyServiceSid, isTwilioConfigured } from "@/lib/twilio";
import { normalizePhone } from "@/lib/utils";
import { createServiceClient } from "@/lib/supabase/admin";

const verifySchema = z.object({
  phone: z.string().min(10),
  code: z.string().length(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, code } = verifySchema.parse(body);
    const normalizedPhone = normalizePhone(phone);

    if (!isTwilioConfigured()) {
      if (process.env.NODE_ENV === "development" && code === "123456") {
        await recordVerification(normalizedPhone);
        return NextResponse.json({ success: true, verified: true, devMode: true });
      }
      return NextResponse.json(
        { error: "Phone verification is not configured" },
        { status: 503 }
      );
    }

    const client = getTwilioClient();
    const check = await client.verify.v2
      .services(getVerifyServiceSid())
      .verificationChecks.create({ to: normalizedPhone, code });

    if (check.status !== "approved") {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    await recordVerification(normalizedPhone);
    return NextResponse.json({ success: true, verified: true });
  } catch (error) {
    console.error("Verify OTP error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

async function recordVerification(phone: string) {
  try {
    const supabase = createServiceClient();
    await supabase.from("phone_verifications").insert({
      phone,
      verified: true,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
  } catch {
    // Non-critical — verification still succeeded via Twilio
  }
}
