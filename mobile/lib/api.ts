import { supabase } from "./supabase";
import type { ReceiptAnalysisResult } from "./receipt-analysis";

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export async function sendOtp(phone: string) {
  return invoke<{ success: boolean; devMode?: boolean }>("send-otp", { phone });
}

export async function verifyOtp(phone: string, code: string) {
  return invoke<{ success: boolean; verified: boolean }>("verify-otp", { phone, code });
}

export async function analyzeReceipt(params: {
  reportId: string;
  imageBase64: string;
  mimeType: string;
  fileName: string;
}) {
  return invoke<{
    success: boolean;
    storagePath: string;
    previewUrl: string | null;
    fileName: string;
    analysis: ReceiptAnalysisResult;
  }>("analyze-receipt", params);
}
