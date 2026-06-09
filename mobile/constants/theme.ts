/** PDX brand palette — Parts Distribution Xpress */
export const brand = {
  green: "#99C221",
  greenDark: "#7A9A1A",
  greenLight: "#EEF6D4",
  black: "#1A1A1A",
  grey: "#707070",
  greyLight: "#E5E5E5",
  greyMuted: "#999999",
  white: "#FFFFFF",
} as const;

export type ThemeColors = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  onPrimary: string;
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
  primary: brand.green,
  primaryLight: "#B5D44A",
  primaryDark: brand.greenDark,
  onPrimary: brand.black,
  accent: brand.green,
  green: brand.green,
  greenLight: brand.greenLight,
  bg: brand.white,
  surface: brand.white,
  text: brand.black,
  textSecondary: brand.grey,
  slate400: brand.greyMuted,
  slate500: brand.grey,
  slate700: "#4A4A4A",
  slate800: brand.black,
  border: brand.greyLight,
  error: "#DC2626",
  errorBg: "#FEF2F2",
  successBg: brand.greenLight,
  success: brand.greenDark,
  relatedTo: brand.greenLight,
  cardShadow: "#000000",
  headerText: brand.black,
  tabBar: brand.white,
  tabBarBorder: brand.greyLight,
  white: brand.white,
};

export const darkColors: ThemeColors = {
  primary: brand.green,
  primaryLight: "#B5D44A",
  primaryDark: brand.greenDark,
  onPrimary: brand.black,
  accent: brand.green,
  green: brand.green,
  greenLight: "#243018",
  bg: "#0F0F0F",
  surface: "#1A1A1A",
  text: "#F5F5F5",
  textSecondary: "#A8A8A8",
  slate400: "#737373",
  slate500: "#9CA3AF",
  slate700: "#D4D4D4",
  slate800: "#F5F5F5",
  border: "#2A2A2A",
  error: "#F87171",
  errorBg: "#450A0A",
  successBg: "#2A3318",
  success: brand.green,
  relatedTo: "#2A3318",
  cardShadow: "#000000",
  headerText: "#F5F5F5",
  tabBar: "#1A1A1A",
  tabBarBorder: "#2A2A2A",
  white: brand.white,
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
