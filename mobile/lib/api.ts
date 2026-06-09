import { invokeFunction } from "./functions-api";
import { normalizeAnalysis } from "./receipt-analysis";

// Twilio OTP — disabled in signup UI for now; edge functions kept for re-enable later.
export async function sendOtp(phone: string) {
  return invokeFunction<{ success: boolean; devMode?: boolean }>("send-otp", { phone });
}

export async function verifyOtp(phone: string, code: string) {
  return invokeFunction<{ success: boolean; verified: boolean }>("verify-otp", { phone, code });
}

export async function analyzeReceipt(params: {
  reportId: string;
  storagePath: string;
  mimeType: string;
  fileName: string;
}) {
  const data = await invokeFunction<{
    success: boolean;
    storagePath: string;
    previewUrl: string | null;
    fileName: string;
    analysis: unknown;
  }>("analyze-receipt", params);

  return {
    ...data,
    analysis: normalizeAnalysis(data.analysis),
  };
}
