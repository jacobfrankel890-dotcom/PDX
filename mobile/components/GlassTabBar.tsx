import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hapticNavigation } from "../lib/haptics";
import { useTheme } from "../lib/settings-context";
import { TAB_BAR_HEIGHT } from "../lib/tab-bar-layout";

type TabRoute = "dashboard" | "expenses" | "activity" | "profile";

type TabConfig = {
  outline: keyof typeof Ionicons.glyphMap;
  filled: keyof typeof Ionicons.glyphMap;
  label: string;
};

const TABS: Record<TabRoute, TabConfig> = {
  dashboard: { outline: "home-outline", filled: "home", label: "Home" },
  expenses: { outline: "receipt-outline", filled: "receipt", label: "Expenses" },
  activity: { outline: "notifications-outline", filled: "notifications", label: "Notifications" },
  profile: { outline: "person-outline", filled: "person", label: "Profile" },
};

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const tab = TABS[route.name as TabRoute] ?? {
          outline: "ellipse-outline" as const,
          filled: "ellipse" as const,
          label: route.name,
        };
        const { options } = descriptors[route.key];
        const badge = options.tabBarBadge;
        const isFocused = state.index === index;

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
            accessibilityLabel={tab.label}
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tab}
          >
            <View
              style={[
                styles.iconWrap,
                isFocused && { backgroundColor: colors.greenLight },
              ]}
            >
              <Ionicons
                name={isFocused ? tab.filled : tab.outline}
                size={22}
                color={isFocused ? colors.primaryDark : colors.textSecondary}
              />
              {badge != null && badge !== false ? (
                <View style={[styles.badge, { backgroundColor: colors.primary }]} />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const ICON_SIZE = 44;

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    minHeight: TAB_BAR_HEIGHT,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
