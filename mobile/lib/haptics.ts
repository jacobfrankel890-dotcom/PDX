import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

async function run(action: () => Promise<void>) {
  if (Platform.OS === "web") return;
  try {
    await action();
  } catch {
    /* haptics unavailable on simulator or unsupported device */
  }
}

export function hapticSelection() {
  return run(() => Haptics.selectionAsync());
}

export function hapticLight() {
  return run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticMedium() {
  return run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function hapticToggle(on: boolean) {
  return run(() =>
    on
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  );
}

export function hapticNavigation() {
  return hapticSelection();
}

export const scrollHapticHandlers = {
  onScrollEndDrag: () => {
    hapticSelection();
  },
  onMomentumScrollEnd: () => {
    hapticSelection();
  },
};
