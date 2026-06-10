import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useNavigation } from "expo-router";
import { supabase } from "../../../lib/supabase";
import {
  countUnreadNotifications,
  fetchNotifications,
  markReminderRead,
  type AppNotification,
} from "../../../lib/notifications-feed";
import { hapticLight } from "../../../lib/haptics";
import { useTheme } from "../../../lib/settings-context";
import { getTabBarStackHeight } from "../../../lib/tab-bar-layout";
import { NotificationItemCard } from "../../../components/NotificationItemCard";
import { spacing, type ThemeColors } from "../../../constants/theme";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);

  const unreadCount = useMemo(() => countUnreadNotifications(items), [items]);

  useLayoutEffect(() => {
    navigation.setOptions({
      tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
    });
  }, [navigation, unreadCount]);

  const load = useCallback(async (silent = false) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/(auth)/welcome");
      return;
    }

    if (!silent && !hasLoadedRef.current) setLoading(true);

    try {
      const feed = await fetchNotifications(user.id);
      setItems(feed);
      hasLoadedRef.current = true;
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(hasLoadedRef.current);
    }, [load])
  );

  function openNotification(item: AppNotification) {
    hapticLight();

    if (item.kind === "missing_expense" && item.reminderId) {
      if (item.unread) {
        markReminderRead(item.reminderId)
          .then(() => {
            setItems((prev) =>
              prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
            );
          })
          .catch(() => {});
      }
      router.push({
        pathname: "/(app)/submit",
        params: {
          prefill: "1",
          merchant: item.merchant ?? "",
          amount: item.amount != null ? String(item.amount) : "",
          date: item.expenseDate ?? "",
          reminderId: item.reminderId,
        },
      });
      return;
    }

    if (item.reportId) {
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
      );
      router.push(`/(app)/reports/${item.reportId}`);
    }
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.pageTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <View style={styles.countPill}>
            <Text style={styles.countText}>{unreadCount} new</Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: getTabBarStackHeight(insets) + spacing.lg },
          items.length === 0 && styles.listEmpty,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <Text style={styles.emptySub}>Loading…</Text>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptySub}>
                Missing receipt alerts and report updates will appear here.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <NotificationItemCard
            item={item}
            colors={colors}
            onPress={() => openNotification(item)}
          />
        )}
      />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: 8,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    pageTitle: { fontSize: 24, fontWeight: "800", color: colors.text, letterSpacing: -0.4 },
    countPill: {
      backgroundColor: colors.greenLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    countText: { fontSize: 12, fontWeight: "700", color: colors.primaryDark },
    list: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
    listEmpty: { flexGrow: 1, justifyContent: "center" },
    separator: { height: spacing.sm },
    emptyCard: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: 6,
    },
    emptyEmoji: { fontSize: 32 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 19 },
  });
}
