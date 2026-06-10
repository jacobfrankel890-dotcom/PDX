import { router } from "expo-router";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { buildNotificationRoute, parseNotificationData } from "./push-notifications";
import { markReminderRead } from "./notifications-feed";

function navigateFromResponse(response: Notifications.NotificationResponse | null) {
  if (!response) return;
  const data = parseNotificationData(response.notification.request.content.data);
  const target = buildNotificationRoute(data);
  if (!target) return;

  if (data?.type === "missing_expense" && data.reminderId) {
    markReminderRead(data.reminderId).catch(() => {});
  }

  if (target.startsWith("/")) {
    router.push(target as never);
    return;
  }

  const parsed = Linking.parse(target);
  if (!parsed.path) return;
  const path = parsed.path.startsWith("/") ? parsed.path : `/${parsed.path}`;
  router.push(path as never);
}

export function useNotificationLinking() {
  useEffect(() => {
    let active = true;

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!active) return;
        navigateFromResponse(response);
      })
      .catch(() => {
        /* ignore */
      });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromResponse(response);
    });

    return () => {
      active = false;
      sub.remove();
    };
  }, []);
}
