import { useCallback, useRef, type RefObject } from "react";
import type { LayoutChangeEvent, ScrollView } from "react-native";

const SCROLL_INSET = 56;

/** Fields that should scroll to the bottom of the form (keyboard-heavy inputs). */
const END_FIELDS = new Set(["purpose", "date"]);

/**
 * Single animated scroll per focus — avoids the slow double-scroll from rAF + delayed timeout.
 */
export function useScrollToField(scrollRef: RefObject<ScrollView | null>) {
  const fieldOffsets = useRef<Record<string, number>>({});
  const scrollingRef = useRef(false);

  const trackFieldLayout = useCallback(
    (key: string) => (e: LayoutChangeEvent) => {
      fieldOffsets.current[key] = e.nativeEvent.layout.y;
    },
    []
  );

  const scrollToField = useCallback(
    (key: string) => {
      if (scrollingRef.current) return;
      scrollingRef.current = true;

      const run = () => {
        if (END_FIELDS.has(key)) {
          scrollRef.current?.scrollToEnd({ animated: true });
        } else {
          const y = fieldOffsets.current[key] ?? 0;
          scrollRef.current?.scrollTo({
            y: Math.max(0, y - SCROLL_INSET),
            animated: true,
          });
        }
        setTimeout(() => {
          scrollingRef.current = false;
        }, 320);
      };

      requestAnimationFrame(run);
    },
    [scrollRef]
  );

  return { trackFieldLayout, scrollToField };
}
