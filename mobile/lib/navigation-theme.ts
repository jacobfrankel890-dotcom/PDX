import { DarkTheme, DefaultTheme, type Theme } from "expo-router";
import type { ThemeColors } from "../constants/theme";

export function getNavigationTheme(isDark: boolean, colors: ThemeColors): Theme {
  const base = isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.bg,
      card: colors.bg,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };
}
