import { Platform, StyleSheet } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";

/** Visible height of the floating glass tab bar (excluding safe area). */
export const TAB_BAR_HEIGHT = 48;

/** Horizontal inset for floating pill shape. */
export const TAB_BAR_SIDE_INSET = 16;

/** Extra gap above home indicator (0 = flush to bottom). */
export const TAB_BAR_BOTTOM_GAP = 0;

/** Height of the Add Receipt bar sitting on the tab bar. */
export const FAB_HEIGHT = 50;

/** Small gap between FAB and tab bar top. */
export const FAB_TAB_GAP = 0;

export function getTabBarStackHeight(insets: EdgeInsets): number {
  return TAB_BAR_HEIGHT + insets.bottom + TAB_BAR_BOTTOM_GAP;
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
