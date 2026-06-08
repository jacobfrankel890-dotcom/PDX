import { Tabs } from "expo-router";
import { GlassTabBar } from "../../../components/GlassTabBar";
import { useTheme } from "../../../lib/settings-context";

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: false,
        detachInactiveScreens: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          elevation: 0,
          borderTopWidth: 0,
          backgroundColor: "transparent",
        },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Home" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
