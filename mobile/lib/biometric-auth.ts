import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform } from "react-native";
import { supabase } from "./supabase";

const REFRESH_TOKEN_KEY = "pdx_biometric_refresh_token";
const BIOMETRIC_ENABLED_KEY = "@pdx/biometric_enabled";

type LocalAuthModule = typeof import("expo-local-authentication");
type SecureStoreModule = typeof import("expo-secure-store");

let localAuthMod: LocalAuthModule | null | undefined;
let secureStoreMod: SecureStoreModule | null | undefined;

async function getLocalAuth(): Promise<LocalAuthModule | null> {
  if (localAuthMod !== undefined) return localAuthMod;
  try {
    localAuthMod = await import("expo-local-authentication");
    return localAuthMod;
  } catch {
    localAuthMod = null;
    return null;
  }
}

async function getSecureStore(): Promise<SecureStoreModule | null> {
  if (secureStoreMod !== undefined) return secureStoreMod;
  try {
    secureStoreMod = await import("expo-secure-store");
    return secureStoreMod;
  } catch {
    secureStoreMod = null;
    return null;
  }
}

export async function getBiometricLabel(): Promise<string> {
  const LocalAuthentication = await getLocalAuth();
  if (!LocalAuthentication) return "Biometrics";
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === "ios" ? "Face ID" : "Face unlock";
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
    }
  } catch {
    /* native module not in this build */
  }
  return "Biometrics";
}

export async function isBiometricHardwareAvailable(): Promise<boolean> {
  const LocalAuthentication = await getLocalAuth();
  if (!LocalAuthentication) return false;
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

export async function isBiometricLoginEnabled(): Promise<boolean> {
  const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
  if (enabled !== "true") return false;
  const SecureStore = await getSecureStore();
  if (!SecureStore) return false;
  try {
    const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    return Boolean(token);
  } catch {
    return false;
  }
}

export async function promptBiometric(reason: string): Promise<boolean> {
  const LocalAuthentication = await getLocalAuth();
  if (!LocalAuthentication) return false;
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function enableBiometricLogin(refreshToken: string): Promise<void> {
  const SecureStore = await getSecureStore();
  if (!SecureStore) throw new Error("Secure storage requires a new app build");
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
}

export async function disableBiometricLogin(): Promise<void> {
  await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  const SecureStore = await getSecureStore();
  if (!SecureStore) return;
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function syncBiometricRefreshToken(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
  if (enabled !== "true") return;
  const SecureStore = await getSecureStore();
  if (!SecureStore) return;
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    /* ignore */
  }
}

export async function signInWithBiometric(): Promise<{ ok: boolean; error?: string }> {
  if (!(await isBiometricLoginEnabled())) {
    return { ok: false, error: "Biometric sign-in is not enabled" };
  }

  const label = await getBiometricLabel();
  const authed = await promptBiometric(`Sign in with ${label}`);
  if (!authed) return { ok: false, error: "Authentication cancelled" };

  const SecureStore = await getSecureStore();
  if (!SecureStore) {
    return { ok: false, error: "Biometric sign-in requires a new app build" };
  }

  let refreshToken: string | null = null;
  try {
    refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return { ok: false, error: "Biometric sign-in requires a new app build" };
  }

  if (!refreshToken) {
    await disableBiometricLogin();
    return { ok: false, error: "Saved session expired — sign in with password once" };
  }

  const { error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error) {
    await disableBiometricLogin();
    return { ok: false, error: "Session expired — sign in with password again" };
  }

  return { ok: true };
}

export async function offerBiometricSetupAfterLogin(): Promise<void> {
  if (!(await isBiometricHardwareAvailable())) return;
  if (await isBiometricLoginEnabled()) return;

  const { data } = await supabase.auth.getSession();
  const refreshToken = data.session?.refresh_token;
  if (!refreshToken) return;

  const label = await getBiometricLabel();
  Alert.alert(
    `Enable ${label}?`,
    `Use ${label} to sign in quickly next time.`,
    [
      { text: "Not now", style: "cancel" },
      {
        text: "Enable",
        onPress: async () => {
          try {
            const authed = await promptBiometric(`Confirm ${label} setup`);
            if (authed) await enableBiometricLogin(refreshToken);
          } catch {
            Alert.alert("Not available yet", "Biometric sign-in requires the next app build from TestFlight.");
          }
        },
      },
    ]
  );
}

/** Call once at app start to keep SecureStore refresh token in sync. */
export function initBiometricSessionSync(): () => void {
  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
      syncBiometricRefreshToken(session?.refresh_token);
    }
  });
  return () => sub.subscription.unsubscribe();
}
