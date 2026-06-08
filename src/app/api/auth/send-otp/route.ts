import { NextResponse } from "next/server";
import { z } from "zod";
import { getTwilioClient, getVerifyServiceSid, isTwilioConfigured } from "@/lib/twilio";
import { normalizePhone } from "@/lib/utils";

const sendSchema = z.object({
  phone: z.string().min(10),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone } = sendSchema.parse(body);
    const normalizedPhone = normalizePhone(phone);

    if (!isTwilioConfigured()) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[DEV] OTP would be sent to ${normalizedPhone}. Code: 123456`);
        return NextResponse.json({
          success: true,
          message: "Verification code sent (dev mode — use 123456)",
          devMode: true,
        });
      }
      return NextResponse.json(
        { error: "Phone verification is not configured" },
        { status: 503 }
      );
    }

    const client = getTwilioClient();
    await client.verify.v2
      .services(getVerifyServiceSid())
      .verifications.create({ to: normalizedPhone, channel: "sms" });

    return NextResponse.json({ success: true, message: "Verification code sent" });
  } catch (error) {
    console.error("Send OTP error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to send verification code" }, { status: 500 });
  }
}
