import { Dimensions } from "react-native";
import { grid } from "../lib/grid";

export const AUTH_BG = "#0A0A0A";
export const AUTH_WHITE = "#FFFFFF";
export const AUTH_WHITE_90 = "rgba(255,255,255,0.92)";
export const AUTH_GRAY_60 = "rgba(255,255,255,0.62)";
export const AUTH_GRAY_45 = "rgba(255,255,255,0.45)";
export const AUTH_BORDER = "rgba(255,255,255,0.18)";
export const AUTH_INPUT_BG = "rgba(255,255,255,0.06)";

export const AUTH_HERO = require("../assets/hero-tire.png");

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function authHeroHeight(compact?: boolean): number {
  if (compact) return Math.round(Math.min(280, Math.max(220, SCREEN_HEIGHT * 0.32)));
  return Math.round(Math.min(340, Math.max(260, SCREEN_HEIGHT * 0.38)));
}

export const authHorizontalPad = grid(3.5);
export const authHeroOverlap = -grid(9);

export { SCREEN_WIDTH };
