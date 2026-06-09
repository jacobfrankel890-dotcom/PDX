import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

export type PushRegistrationResult = {
  ok: boolean;
  token?: string;
  error?: string;
  syncError?: string;
};

let notificationHandlerConfigured = false;

export function configureNotificationHandler() {
  if (notificationHandlerConfigured) return;
  notificationHandlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function resolveProjectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ??
    (typeof Constants.expoConfig?.extra?.eas?.projectId === "string"
      ? Constants.expoConfig.extra.eas.projectId
      : undefined)
  );
}

function formatPushRegistrationError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Failed to register for push notifications.";
  const lower = raw.toLowerCase();

  if (
    Platform.OS === "android" &&
    (lower.includes("firebase") ||
      lower.includes("google-services") ||
      lower.includes("firebaseapp is not initialized"))
  ) {
    return [
      "Android push is not configured yet.",
      "",
      "Add google-services.json from Firebase (package: com.partsdistributionxpress.expense),",
      "upload FCM credentials in EAS, then install a new Android build.",
      "",
      "See mobile/NATIVE_BUILD_CHECKLIST.md for the full setup.",
    ].join("\n");
  }

  return raw;
}

async function upsertPushTokenForCurrentUser(token: string): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { error } = await supabase.from("user_push_tokens").upsert(
    {
      user_id: user.id,
      expo_push_token: token,
      platform: Platform.OS,
      enabled: true,
    },
    { onConflict: "user_id,expo_push_token" }
  );

  return error ? error.message : null;
}

export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  if (!Device.isDevice) {
    return { ok: false, error: "Push notifications require a physical device." };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#99C221",
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const request = await Notifications.requestPermissionsAsync();
    finalStatus = request.status;
  }

  if (finalStatus !== "granted") {
    return { ok: false, error: "Push permission was not granted." };
  }

  try {
    const projectId = resolveProjectId();
    const tokenResult = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    const token = tokenResult.data;
    const syncError = await upsertPushTokenForCurrentUser(token);

    return { ok: true, token, syncError: syncError ?? undefined };
  } catch (error) {
    return {
      ok: false,
      error: formatPushRegistrationError(error),
    };
  }
}

export async function disablePushNotificationsForCurrentUser(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("user_push_tokens").update({ enabled: false }).eq("user_id", user.id);
}

export type NotificationData = {
  type?: string;
  route?: string;
  path?: string;
  url?: string;
  reminderId?: string;
  merchant?: string;
  amount?: string;
  expenseDate?: string;
  note?: string;
};

export function parseNotificationData(data: unknown): NotificationData | null {
  if (!data || typeof data !== "object") return null;
  return data as NotificationData;
}

export function buildNotificationRoute(data: unknown): string | null {
  const record = parseNotificationData(data);
  if (!record) return null;

  if (record.type === "missing_expense") {
    const params = new URLSearchParams();
    params.set("prefill", "1");
    if (record.reminderId) params.set("reminderId", record.reminderId);
    if (record.merchant) params.set("merchant", record.merchant);
    if (record.amount) params.set("amount", record.amount);
    if (record.expenseDate) params.set("date", record.expenseDate);
    if (record.note) params.set("note", record.note);
    return `/(app)/submit?${params.toString()}`;
  }

  const url = record.url;
  const route = record.route;
  const path = record.path;

  if (typeof url === "string" && url.length > 0) return url;
  if (typeof route === "string" && route.length > 0) return route;
  if (typeof path === "string" && path.length > 0) return path;
  return null;
}

export function getNotificationTarget(data: unknown): string | null {
  return buildNotificationRoute(data);
}
