import AsyncStorage from "@react-native-async-storage/async-storage";
import { requireOptionalNativeModule } from "expo-modules-core";
import { Alert, Platform } from "react-native";
import { supabase } from "./supabase";

const REFRESH_TOKEN_KEY = "pdx_biometric_refresh_token";
const BIOMETRIC_ENABLED_KEY = "@pdx/biometric_enabled";

const AUTHENTICATION_TYPE = {
  FINGERPRINT: 1,
  FACIAL_RECOGNITION: 2,
  IRIS: 3,
} as const;

type LocalAuthNative = {
  hasHardwareAsync(): Promise<boolean>;
  isEnrolledAsync(): Promise<boolean>;
  supportedAuthenticationTypesAsync(): Promise<number[]>;
  authenticateAsync(options: {
    promptMessage: string;
    cancelLabel?: string;
    disableDeviceFallback?: boolean;
  }): Promise<{ success: boolean }>;
};

type SecureStoreNative = {
  getValueWithKeyAsync(key: string, options?: Record<string, unknown>): Promise<string | null>;
  setValueWithKeyAsync(value: string, key: string, options?: Record<string, unknown>): Promise<void>;
  deleteValueWithKeyAsync(key: string, options?: Record<string, unknown>): Promise<void>;
};

function getLocalAuthNative(): LocalAuthNative | null {
  return requireOptionalNativeModule<LocalAuthNative>("ExpoLocalAuthentication");
}

function getSecureStoreNative(): SecureStoreNative | null {
  return requireOptionalNativeModule<SecureStoreNative>("ExpoSecureStore");
}

function getErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim().length > 0) return error;
  return null;
}

export function isBiometricNativeAvailable(): boolean {
  const LocalAuthentication = getLocalAuthNative();
  const SecureStore = getSecureStoreNative();
  return Boolean(
    LocalAuthentication?.authenticateAsync &&
      LocalAuthentication?.hasHardwareAsync &&
      LocalAuthentication?.isEnrolledAsync &&
      LocalAuthentication?.supportedAuthenticationTypesAsync &&
      SecureStore?.getValueWithKeyAsync &&
      SecureStore?.setValueWithKeyAsync &&
      SecureStore?.deleteValueWithKeyAsync
  );
}

export async function getBiometricLabel(): Promise<string> {
  const LocalAuthentication = getLocalAuthNative();
  if (!LocalAuthentication) return "Biometrics";
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(AUTHENTICATION_TYPE.FACIAL_RECOGNITION)) {
      return Platform.OS === "ios" ? "Face ID" : "Face unlock";
    }
    if (types.includes(AUTHENTICATION_TYPE.FINGERPRINT)) {
      return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
    }
  } catch {
    /* native module not in this build */
  }
  return "Biometrics";
}

export async function isBiometricHardwareAvailable(): Promise<boolean> {
  const LocalAuthentication = getLocalAuthNative();
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
  const SecureStore = getSecureStoreNative();
  if (!SecureStore?.getValueWithKeyAsync) return false;
  try {
    const token = await SecureStore.getValueWithKeyAsync(REFRESH_TOKEN_KEY, {});
    return Boolean(token);
  } catch {
    return false;
  }
}

export async function promptBiometric(reason: string): Promise<boolean> {
  const LocalAuthentication = getLocalAuthNative();
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
  const SecureStore = getSecureStoreNative();
  if (!SecureStore?.setValueWithKeyAsync) {
    throw new Error("Secure storage is not available on this device.");
  }
  try {
    await SecureStore.setValueWithKeyAsync(refreshToken, REFRESH_TOKEN_KEY, {});
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
  } catch (error) {
    const detail = getErrorMessage(error);
    throw new Error(
      detail
        ? `Could not enable biometric sign-in: ${detail}`
        : "Could not enable biometric sign-in. Please try again."
    );
  }
}

export async function disableBiometricLogin(): Promise<void> {
  await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  const SecureStore = getSecureStoreNative();
  if (!SecureStore?.deleteValueWithKeyAsync) return;
  try {
    await SecureStore.deleteValueWithKeyAsync(REFRESH_TOKEN_KEY, {});
  } catch {
    /* ignore */
  }
}

async function isBiometricPreferenceEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY)) === "true";
}

/** Sign out of the app but keep Face ID credentials for quick sign-in. */
export async function signOutPreservingBiometric(): Promise<void> {
  if (await isBiometricPreferenceEnabled()) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.refresh_token) {
      await syncBiometricRefreshToken(data.session.refresh_token);
    }
    await supabase.auth.signOut({ scope: "local" });
    return;
  }

  await supabase.auth.signOut();
}

export async function syncBiometricRefreshToken(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
  if (enabled !== "true") return;
  const SecureStore = getSecureStoreNative();
  if (!SecureStore?.setValueWithKeyAsync) return;
  try {
    await SecureStore.setValueWithKeyAsync(refreshToken, REFRESH_TOKEN_KEY, {});
  } catch {
    /* ignore */
  }
}

export async function signInWithBiometric(): Promise<{ ok: boolean; error?: string }> {
  if (!isBiometricNativeAvailable()) {
    return { ok: false, error: "Biometric sign-in requires a new app build" };
  }
  if (!(await isBiometricLoginEnabled())) {
    return { ok: false, error: "Biometric sign-in is not enabled" };
  }

  const label = await getBiometricLabel();
  const authed = await promptBiometric(`Sign in with ${label}`);
  if (!authed) return { ok: false, error: "Authentication cancelled" };

  const SecureStore = getSecureStoreNative();
  if (!SecureStore?.getValueWithKeyAsync) {
    return { ok: false, error: "Biometric sign-in requires a new app build" };
  }

  let refreshToken: string | null = null;
  try {
    refreshToken = await SecureStore.getValueWithKeyAsync(REFRESH_TOKEN_KEY, {});
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
  if (!isBiometricNativeAvailable()) return;
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
          } catch (error) {
            const detail = getErrorMessage(error);
            Alert.alert(
              "Couldn't enable biometrics",
              detail ??
                "Biometric sign-in could not be enabled on this device. You can try again later from Profile > Security."
            );
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
