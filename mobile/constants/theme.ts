export type ThemeColors = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  green: string;
  greenLight: string;
  bg: string;
  surface: string;
  text: string;
  textSecondary: string;
  slate400: string;
  slate500: string;
  slate700: string;
  slate800: string;
  border: string;
  error: string;
  errorBg: string;
  successBg: string;
  success: string;
  relatedTo: string;
  cardShadow: string;
  headerText: string;
  tabBar: string;
  tabBarBorder: string;
  white: string;
};

export const lightColors: ThemeColors = {
  primary: "#1e3a5f",
  primaryLight: "#2d5a8e",
  primaryDark: "#152a45",
  accent: "#e85d04",
  green: "#2d6a4f",
  greenLight: "#d8f3dc",
  bg: "#f8fafc",
  surface: "#ffffff",
  text: "#1e293b",
  textSecondary: "#64748b",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate700: "#334155",
  slate800: "#1e293b",
  border: "#e2e8f0",
  error: "#dc2626",
  errorBg: "#fef2f2",
  successBg: "#f0fdf4",
  success: "#166534",
  relatedTo: "#b4d7ff",
  cardShadow: "#0f172a",
  headerText: "#ffffff",
  tabBar: "#ffffff",
  tabBarBorder: "#e2e8f0",
  white: "#ffffff",
};

export const darkColors: ThemeColors = {
  primary: "#5b9bd5",
  primaryLight: "#7eb3e8",
  primaryDark: "#1e3a5f",
  accent: "#f97316",
  green: "#4ade80",
  greenLight: "#14532d",
  bg: "#0f172a",
  surface: "#1e293b",
  text: "#f1f5f9",
  textSecondary: "#94a3b8",
  slate400: "#64748b",
  slate500: "#94a3b8",
  slate700: "#cbd5e1",
  slate800: "#f1f5f9",
  border: "#334155",
  error: "#f87171",
  errorBg: "#450a0a",
  successBg: "#14532d",
  success: "#4ade80",
  relatedTo: "#1e3a5f",
  cardShadow: "#000000",
  headerText: "#f1f5f9",
  tabBar: "#1e293b",
  tabBarBorder: "#334155",
  white: "#ffffff",
};

/** @deprecated use useTheme().colors */
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  full: 999,
};

export function getColors(isDark: boolean): ThemeColors {
  return isDark ? darkColors : lightColors;
}
