import twilio from "twilio";

let twilioClient: ReturnType<typeof twilio> | null = null;

export function getTwilioClient() {
  if (!twilioClient) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  }
  return twilioClient;
}

export function getVerifyServiceSid(): string {
  return process.env.TWILIO_VERIFY_SERVICE_SID!;
}

export function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_VERIFY_SERVICE_SID
  );
}
