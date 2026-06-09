import { Platform } from "react-native";
import type { ThemeColors } from "../constants/theme";

/** Height of ScreenHeader bar below the safe-area inset. */
export const STACK_HEADER_HEIGHT = 56;

export function getStackKeyboardOffset(insets: { top: number }) {
  return insets.top + STACK_HEADER_HEIGHT;
}

export function getStackScreenOptions(colors: ThemeColors) {
  return {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.primary,
    headerTitleStyle: { fontWeight: "700" as const, color: colors.text },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal" as const,
    headerBackTitle: "",
    contentStyle: { backgroundColor: colors.bg },
    animation: "default" as const,
    ...(Platform.OS === "ios" ? { fullScreenGestureEnabled: true } : {}),
  };
}
