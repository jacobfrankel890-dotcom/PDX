import Constants from "expo-constants";

/** Deployed Next.js app URL — set in eas.json or .env for local Expo dev */
export const APP_URL =
  process.env.EXPO_PUBLIC_APP_URL ??
  Constants.expoConfig?.extra?.appUrl ??
  "";

export const APP_NAME = "PDX Expense";
