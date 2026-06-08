import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../lib/settings-context";
import {
  TAB_BAR_BOTTOM_GAP,
  TAB_BAR_HEIGHT,
} from "../lib/tab-bar-layout";

const TAB_ICONS: Record<string, string> = {
  dashboard: "🏠",
  profile: "👤",
};

function useGlassSurface(isDark: boolean) {
  const tint = isDark ? "rgba(30,41,59,0.78)" : "rgba(255,255,255,0.72)";
  const border = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.55)";

  try {
    if (Platform.OS === "ios") {
      const { GlassView, isGlassEffectAPIAvailable } = require("expo-glass-effect");
      if (isGlassEffectAPIAvailable()) {
        return {
          mode: "glass" as const,
          GlassView,
          colorScheme: isDark ? ("dark" as const) : ("light" as const),
        };
      }
    }
  } catch {
    /* native glass not in this build */
  }

  try {
    const { BlurView } = require("expo-blur");
    return { mode: "blur" as const, BlurView, tint: isDark ? ("dark" as const) : ("light" as const), overlay: tint };
  } catch {
    return { mode: "solid" as const, backgroundColor: tint, borderColor: border };
  }
}

function TabBarSurface({
  children,
  isDark,
  bottomInset,
}: {
  children: React.ReactNode;
  isDark: boolean;
  bottomInset: number;
}) {
  const surface = useGlassSurface(isDark);
  const surfaceStyle = [styles.glassSurface, { paddingBottom: bottomInset }];

  if (surface.mode === "glass") {
    const { GlassView, colorScheme } = surface;
    return (
      <GlassView
        style={surfaceStyle}
        glassEffectStyle="regular"
        colorScheme={colorScheme}
        isInteractive
      >
        <View style={styles.tabRow}>{children}</View>
      </GlassView>
    );
  }

  if (surface.mode === "blur") {
    const { BlurView, tint, overlay } = surface;
    return (
      <View style={[surfaceStyle, { borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.55)" }]}>
        <BlurView intensity={80} tint={tint} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} />
        <View style={styles.tabRow}>{children}</View>
      </View>
    );
  }

  return (
    <View
      style={[
        surfaceStyle,
        { backgroundColor: surface.backgroundColor, borderColor: surface.borderColor },
      ]}
    >
      <View style={styles.tabRow}>{children}</View>
    </View>
  );
}

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <TabBarSurface isDark={isDark} bottomInset={insets.bottom + TAB_BAR_BOTTOM_GAP}>
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
              navigation.navigate(route.name);
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
              <View style={[styles.iconWrap, isFocused && { backgroundColor: `${colors.primary}22` }]}>
                <Text style={[styles.icon, isFocused && styles.iconFocused]}>{icon}</Text>
              </View>
              <Text style={[styles.label, { color: isFocused ? colors.primary : colors.slate500 }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </TabBarSurface>
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
  glassSurface: {
    overflow: "hidden",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
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
