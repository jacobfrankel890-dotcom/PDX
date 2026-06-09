import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

const ImpactFeedbackStyle = {
  Light: "light",
  Medium: "medium",
} as const;

const NotificationFeedbackType = {
  Success: "success",
} as const;

type HapticsNative = {
  selectionAsync(): Promise<void>;
  impactAsync(style: string): Promise<void>;
  notificationAsync(type: string): Promise<void>;
};

function getHapticsNative(): HapticsNative | null {
  return requireOptionalNativeModule<HapticsNative>("ExpoHaptics");
}

async function run(action: (native: HapticsNative) => Promise<void>) {
  if (Platform.OS === "web") return;
  const native = getHapticsNative();
  if (!native) return;
  try {
    await action(native);
  } catch {
    /* haptics unavailable on simulator or unsupported device */
  }
}

export function hapticSelection() {
  return run((native) => native.selectionAsync());
}

export function hapticLight() {
  return run((native) => native.impactAsync(ImpactFeedbackStyle.Light));
}

export function hapticMedium() {
  return run((native) => native.impactAsync(ImpactFeedbackStyle.Medium));
}

export function hapticToggle(on: boolean) {
  return run((native) =>
    on
      ? native.notificationAsync(NotificationFeedbackType.Success)
      : native.impactAsync(ImpactFeedbackStyle.Light)
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
