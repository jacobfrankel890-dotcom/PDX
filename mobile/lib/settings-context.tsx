import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Alert, useColorScheme } from "react-native";
import { getColors, type ThemeColors } from "../constants/theme";
import {
  disablePushNotificationsForCurrentUser,
  registerForPushNotificationsAsync,
} from "./push-notifications";

export type ThemeMode = "light" | "dark" | "system";

export type NotificationSettings = {
  pushEnabled: boolean;
  expenseReminders: boolean;
  reportUpdates: boolean;
};

type SettingsContextValue = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: ThemeColors;
  notifications: NotificationSettings;
  setPushEnabled: (enabled: boolean) => Promise<void>;
  setExpenseReminders: (enabled: boolean) => void;
  setReportUpdates: (enabled: boolean) => void;
  pushToken: string | null;
};

const STORAGE_THEME = "@pdx/theme";
const STORAGE_NOTIFICATIONS = "@pdx/notifications";

const defaultNotifications: NotificationSettings = {
  pushEnabled: false,
  expenseReminders: true,
  reportUpdates: true,
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);
  const [pushToken, setPushToken] = useState<string | null>(null);
  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_THEME, STORAGE_NOTIFICATIONS]).then(([[, theme], [, notif]]) => {
      if (theme === "light" || theme === "dark" || theme === "system") {
        setThemeModeState(theme);
      }
      if (notif) {
        try {
          setNotifications({ ...defaultNotifications, ...JSON.parse(notif) });
        } catch {
          /* ignore */
        }
      }
    });
  }, []);

  const isDark = themeMode === "system" ? systemScheme === "dark" : themeMode === "dark";
  const colors = useMemo(() => getColors(isDark), [isDark]);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(STORAGE_THEME, mode);
  }, []);

  const persistNotifications = useCallback(async (next: NotificationSettings) => {
    setNotifications(next);
    await AsyncStorage.setItem(STORAGE_NOTIFICATIONS, JSON.stringify(next));
  }, []);

  const registerForPush = useCallback(async (silent = false): Promise<boolean> => {
    const result = await registerForPushNotificationsAsync();
    if (!result.ok) {
      if (!silent) {
        Alert.alert("Push setup failed", result.error ?? "Could not enable push notifications.");
      }
      return false;
    }

    if (result.token) {
      setPushToken(result.token);
    }

    if (result.syncError && !silent) {
      Alert.alert(
        "Push enabled with warning",
        "Push is enabled on this device, but token sync to backend failed. Run the push-token migration in Supabase."
      );
    }

    return true;
  }, []);

  const setPushEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        const ok = await registerForPush(false);
        await persistNotifications({ ...notifications, pushEnabled: ok });
      } else {
        await disablePushNotificationsForCurrentUser().catch(() => {
          /* ignore */
        });
        setPushToken(null);
        await persistNotifications({ ...notifications, pushEnabled: false });
      }
    },
    [notifications, persistNotifications, registerForPush]
  );

  useEffect(() => {
    if (!notifications.pushEnabled) return;
    registerForPush(true).catch(() => {
      /* ignore */
    });
  }, [notifications.pushEnabled, registerForPush]);

  const setExpenseReminders = useCallback(
    (enabled: boolean) => {
      persistNotifications({ ...notifications, expenseReminders: enabled });
    },
    [notifications, persistNotifications]
  );

  const setReportUpdates = useCallback(
    (enabled: boolean) => {
      persistNotifications({ ...notifications, reportUpdates: enabled });
    },
    [notifications, persistNotifications]
  );

  const value = useMemo(
    () => ({
      themeMode,
      setThemeMode,
      isDark,
      colors,
      notifications,
      setPushEnabled,
      setExpenseReminders,
      setReportUpdates,
      pushToken,
    }),
    [
      themeMode,
      setThemeMode,
      isDark,
      colors,
      notifications,
      setPushEnabled,
      setExpenseReminders,
      setReportUpdates,
      pushToken,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export function useTheme() {
  const { colors, isDark, themeMode, setThemeMode } = useSettings();
  return { colors, isDark, themeMode, setThemeMode };
}
