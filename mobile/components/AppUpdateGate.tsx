import { useAppUpdates } from "../lib/use-app-updates";

/** Mount once at root to check for OTA updates on launch and when returning to foreground. */
export function AppUpdateGate() {
  useAppUpdates(true);
  return null;
}
