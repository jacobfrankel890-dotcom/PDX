import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  Constants.expoConfig?.extra?.supabaseUrl ??
  "";

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  Constants.expoConfig?.extra?.supabaseAnonKey ??
  "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/** Clear the active session locally without revoking refresh tokens on the server. */
export async function clearLocalAuthSessionOnly(): Promise<void> {
  type AuthInternals = {
    stopAutoRefresh?: () => Promise<void>;
    _removeSession?: () => Promise<void>;
  };

  const auth = supabase.auth as unknown as AuthInternals;
  await auth.stopAutoRefresh?.();
  await auth._removeSession?.();
}
