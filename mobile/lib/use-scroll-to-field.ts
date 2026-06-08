import { useCallback, useEffect, useRef, type RefObject } from "react";
import { Keyboard, Platform, type LayoutChangeEvent, type ScrollView } from "react-native";

const SCROLL_INSET = 56;

/** Fields that should scroll to the bottom of the form (keyboard-heavy inputs). */
const END_FIELDS = new Set(["purpose", "date"]);

/**
 * One animated scroll per focus — synced with the keyboard on iOS so the motion
 * feels swift instead of a slow double-scroll (rAF + delayed timeout).
 */
export function useScrollToField(scrollRef: RefObject<ScrollView | null>) {
  const fieldOffsets = useRef<Record<string, number>>({});
  const pendingKey = useRef<string | null>(null);
  const keyboardUp = useRef(false);

  const performScroll = useCallback(
    (key: string) => {
      if (END_FIELDS.has(key)) {
        scrollRef.current?.scrollToEnd({ animated: true });
      } else {
        const y = fieldOffsets.current[key] ?? 0;
        scrollRef.current?.scrollTo({
          y: Math.max(0, y - SCROLL_INSET),
          animated: true,
        });
      }
    },
    [scrollRef]
  );

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => {
      keyboardUp.current = true;
      const key = pendingKey.current;
      if (key) {
        performScroll(key);
        pendingKey.current = null;
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardUp.current = false;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [performScroll]);

  const trackFieldLayout = useCallback(
    (key: string) => (e: LayoutChangeEvent) => {
      fieldOffsets.current[key] = e.nativeEvent.layout.y;
    },
    []
  );

  const scrollToField = useCallback(
    (key: string) => {
      if (key === "date") {
        performScroll(key);
        return;
      }

      if (keyboardUp.current) {
        performScroll(key);
        return;
      }

      pendingKey.current = key;

      if (Platform.OS === "android") {
        requestAnimationFrame(() => {
          if (pendingKey.current === key) {
            performScroll(key);
            pendingKey.current = null;
          }
        });
      }
    },
    [performScroll]
  );

  return { trackFieldLayout, scrollToField };
}
