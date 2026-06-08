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
export const AUTH_LOGO = require("../assets/pdx-logo.png");

export const AUTH_TRUST_ITEMS = [
  { icon: "✓", label: "Scan receipts" },
  { icon: "▸", label: "Submit fast" },
  { icon: "◎", label: "On the road" },
] as const;

export const AUTH_TAGLINE =
  "Scan receipts on the road and submit expenses — built for parts distribution teams.";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function authHeroHeight(compact?: boolean): number {
  if (compact) return Math.round(Math.min(300, Math.max(240, SCREEN_HEIGHT * 0.34)));
  return Math.round(Math.min(380, Math.max(280, SCREEN_HEIGHT * 0.42)));
}

export const authHorizontalPad = grid(3.5);
/** Space between hero photo and content block — keeps copy off the tire image. */
export const authContentTopGap = grid(3);

export { SCREEN_WIDTH };
