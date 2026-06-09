import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export async function readFunctionError(error: unknown): Promise<string | null> {
  if (!(error instanceof FunctionsHttpError)) return null;
  try {
    const raw = await error.context.text();
    if (!raw) return null;
    try {
      const context = JSON.parse(raw) as { error?: unknown };
      if (context?.error) return String(context.error);
    } catch {
      if (raw.trimStart().startsWith("<?xml") || raw.trimStart().startsWith("<")) {
        return "Server returned an unexpected response. Try again in a moment.";
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const detail = await readFunctionError(error);
    throw new Error(detail ?? error.message);
  }
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
  return data as T;
}
