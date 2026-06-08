import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}

export const ALLOWED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

export const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
