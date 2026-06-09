import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hapticNavigation } from "../lib/haptics";
import { useTheme } from "../lib/settings-context";
import {
  TAB_BAR_BOTTOM_GAP,
  TAB_BAR_HEIGHT,
} from "../lib/tab-bar-layout";

const TAB_ICONS: Record<string, string> = {
  dashboard: "🏠",
  profile: "👤",
};

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const surfaceBg = colors.tabBar;
  const borderColor = colors.tabBarBorder;

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <View
        style={[
          styles.surface,
          {
            paddingBottom: insets.bottom + TAB_BAR_BOTTOM_GAP,
            backgroundColor: surfaceBg,
            borderColor,
          },
        ]}
      >
        <View style={styles.tabRow}>
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
                style={styles.tab}
              >
                <View style={[styles.iconWrap, isFocused && { backgroundColor: colors.greenLight }]}>
                  <Text style={[styles.icon, isFocused && styles.iconFocused]}>{icon}</Text>
                </View>
                <Text style={[styles.label, { color: isFocused ? colors.primary : colors.slate500 }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
  },
  surface: {
    overflow: "hidden",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 14,
  },
  tabRow: {
    height: TAB_BAR_HEIGHT,
    flexDirection: "row",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    paddingVertical: 4,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 16, opacity: 0.85 },
  iconFocused: { fontSize: 17, opacity: 1 },
  label: { fontSize: 10, fontWeight: "600", letterSpacing: 0.2 },
});
