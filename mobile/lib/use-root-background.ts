import { useEffect } from "react";
import * as SystemUI from "expo-system-ui";
import { useTheme } from "./settings-context";

/** Keep the native window/root view background in sync with the app theme (prevents white corner bleed on iOS transitions). */
export function useRootBackground() {
  const { colors } = useTheme();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {
      /* native module may be unavailable on older builds */
    });
  }, [colors.bg]);
}
