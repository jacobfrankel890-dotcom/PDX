import * as Updates from "expo-updates";
import { useCallback, useEffect, useRef, useState } from "react";

export type UpdateStatus = "idle" | "checking" | "downloading" | "ready" | "error" | "dev";

export type UpdateInfo = {
  status: UpdateStatus;
  message: string;
  channel: string | null;
  runtimeVersion: string | null;
  updateId: string | null;
  isEmbedded: boolean;
};

function buildInfo(): Pick<UpdateInfo, "channel" | "runtimeVersion" | "updateId" | "isEmbedded"> {
  return {
    channel: Updates.channel ?? null,
    runtimeVersion: Updates.runtimeVersion ?? null,
    updateId: Updates.updateId ?? null,
    isEmbedded: Updates.isEmbeddedLaunch,
  };
}

export function useAppUpdates(autoCheck = true) {
  const checkedRef = useRef(false);
  const [info, setInfo] = useState<UpdateInfo>(() => ({
    status: __DEV__ ? "dev" : "idle",
    message: __DEV__ ? "Updates disabled in development" : "",
    ...buildInfo(),
  }));

  const checkForUpdate = useCallback(async (reloadIfReady = false) => {
    if (__DEV__) {
      setInfo({
        status: "dev",
        message: "Updates disabled in development",
        ...buildInfo(),
      });
      return false;
    }

    if (!Updates.isEnabled) {
      setInfo({
        status: "error",
        message: "OTA not enabled — install the latest TestFlight build",
        ...buildInfo(),
      });
      return false;
    }

    setInfo((prev) => ({ ...prev, status: "checking", message: "Checking for updates…" }));

    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        setInfo({
          status: "idle",
          message: "You're on the latest version",
          ...buildInfo(),
        });
        return false;
      }

      setInfo((prev) => ({ ...prev, status: "downloading", message: "Downloading update…" }));
      await Updates.fetchUpdateAsync();

      setInfo({
        status: "ready",
        message: reloadIfReady ? "Applying update…" : "Update ready — tap Check for updates to apply",
        ...buildInfo(),
      });

      if (reloadIfReady) {
        await Updates.reloadAsync();
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update check failed";
      setInfo({
        status: "error",
        message: msg,
        ...buildInfo(),
      });
      return false;
    }
  }, []);

  useEffect(() => {
    if (!autoCheck || __DEV__ || checkedRef.current) return;
    checkedRef.current = true;

    // Download silently on launch — never auto-reload (prevents crash loops from bad OTAs).
    checkForUpdate(false);
  }, [autoCheck, checkForUpdate]);

  return { info, checkForUpdate };
}
