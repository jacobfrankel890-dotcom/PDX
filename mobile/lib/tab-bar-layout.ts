import { Platform, StyleSheet } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";

/** Visible tab bar height above the safe area. */
export const TAB_BAR_HEIGHT = 52;

/** Height of the Add Receipt bar sitting on the tab bar. */
export const FAB_HEIGHT = 50;

/** Gap between Add Receipt button and tab bar. */
export const FAB_TAB_GAP = 8;

export function getTabBarStackHeight(insets: EdgeInsets): number {
  return TAB_BAR_HEIGHT + insets.bottom;
}

export function getFabBottom(insets: EdgeInsets): number {
  return getTabBarStackHeight(insets) + FAB_TAB_GAP;
}

export function getHomeListBottomPadding(insets: EdgeInsets): number {
  return getFabBottom(insets) + FAB_HEIGHT + 16;
}

export const tabBarLayout = StyleSheet.create({
  fabShadow: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
});
