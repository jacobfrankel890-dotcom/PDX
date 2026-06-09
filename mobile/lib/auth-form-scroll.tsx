import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { findNodeHandle, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { grid } from "./grid";

export type AuthScrollMode = "default" | "top";

type AuthFormScrollContextValue = {
  scrollToField: (fieldRef: RefObject<View | null>, mode?: AuthScrollMode) => void;
};

const AuthFormScrollContext = createContext<AuthFormScrollContextValue | null>(null);

type ProviderProps = {
  scrollRef: RefObject<ScrollView | null>;
  children: ReactNode;
};

export function AuthFormScrollProvider({ scrollRef, children }: ProviderProps) {
  const insets = useSafeAreaInsets();

  const scrollToField = useCallback(
    (fieldRef: RefObject<View | null>, mode: AuthScrollMode = "default") => {
      const field = fieldRef.current;
      const scroll = scrollRef.current;
      if (!field || !scroll) return;

      const delay = Platform.OS === "android" ? 120 : 60;

      setTimeout(() => {
        const scrollNode = findNodeHandle(scroll);
        if (!scrollNode) return;

        field.measureLayout(
          scrollNode,
          (_x, y) => {
            const topOffset = insets.top + grid(2);
            const targetY =
              mode === "top" ? Math.max(0, y - topOffset) : Math.max(0, y - grid(10));
            scroll.scrollTo({ y: targetY, animated: true });
          },
          () => {
            /* measure failed — keyboard insets may still help */
          }
        );
      }, delay);
    },
    [insets.top, scrollRef]
  );

  return (
    <AuthFormScrollContext.Provider value={{ scrollToField }}>
      {children}
    </AuthFormScrollContext.Provider>
  );
}

export function useAuthFormScroll() {
  return useContext(AuthFormScrollContext);
}
