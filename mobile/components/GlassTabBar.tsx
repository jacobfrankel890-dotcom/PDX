import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hapticNavigation } from "../lib/haptics";
import { useTheme } from "../lib/settings-context";
import {
  TAB_BAR_BOTTOM_GAP,
  TAB_BAR_FLOAT_MARGIN,
  TAB_BAR_HEIGHT,
  TAB_BAR_SIDE_INSET,
} from "../lib/tab-bar-layout";

const TAB_ICONS: Record<string, string> = {
  dashboard: "🏠",
  profile: "👤",
};

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: insets.bottom + TAB_BAR_FLOAT_MARGIN + TAB_BAR_BOTTOM_GAP }]}
    >
      <View
        style={[
          styles.pillBar,
          {
            backgroundColor: isDark ? colors.surface : colors.white,
            borderColor: colors.tabBarBorder,
            shadowColor: colors.cardShadow,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : typeof options.title === "string"
                ? options.title
                : route.name;

          const isFocused = state.index === index;
          const icon = TAB_ICONS[route.name] ?? "•";

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              hapticNavigation();
              navigation.jumpTo(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            >
              <View
                style={[
                  styles.tabPill,
                  isFocused && {
                    backgroundColor: colors.greenLight,
                  },
                ]}
              >
                <Text style={[styles.icon, isFocused && styles.iconFocused]}>{icon}</Text>
                <Text
                  style={[
                    styles.label,
                    { color: isFocused ? colors.primaryDark : colors.textSecondary },
                    isFocused && styles.labelFocused,
                  ]}
                >
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: TAB_BAR_SIDE_INSET,
  },
  pillBar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: TAB_BAR_HEIGHT,
    padding: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  icon: {
    fontSize: 18,
    opacity: 0.75,
  },
  iconFocused: {
    fontSize: 19,
    opacity: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  labelFocused: {
    fontWeight: "700",
  },
});
