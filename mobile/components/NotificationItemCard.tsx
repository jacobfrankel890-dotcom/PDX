import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import type { AppNotification } from "../lib/notifications-feed";
import { radius, spacing, type ThemeColors } from "../constants/theme";

type Props = {
  item: AppNotification;
  colors: ThemeColors;
  onPress: () => void;
  onDismiss?: () => void;
};

const KIND_ICON: Record<AppNotification["kind"], keyof typeof Ionicons.glyphMap> = {
  missing_expense: "alert-circle",
  report_submitted: "paper-plane",
  report_approved: "checkmark-circle",
  report_rejected: "close-circle",
};

function formatWhen(value: string): string {
  try {
    return format(parseISO(value), "MMM d, h:mm a");
  } catch {
    return value;
  }
}

export function NotificationItemCard({ item, colors, onPress, onDismiss }: Props) {
  const styles = makeStyles(colors);
  const iconName = KIND_ICON[item.kind];
  const showPendingPill = item.pending && !item.unread;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, item.unread && styles.unread, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.iconWrap, item.unread && styles.iconUnread]}>
        <Ionicons name={iconName} size={22} color={item.unread ? colors.primaryDark : colors.textSecondary} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, item.unread && styles.titleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.unread ? <View style={styles.unreadDot} /> : null}
          {showPendingPill ? (
            <View style={styles.pendingPill}>
              <Text style={styles.pendingPillText}>Pending</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.bodyText} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.when}>{formatWhen(item.createdAt)}</Text>
      </View>
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={10} style={styles.dismiss}>
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    unread: {
      borderColor: colors.primary,
      backgroundColor: colors.greenLight,
    },
    pressed: { opacity: 0.92 },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    iconUnread: { backgroundColor: colors.surface },
    body: { flex: 1, minWidth: 0, gap: 4 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    title: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
    titleUnread: { fontWeight: "800" },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    pendingPill: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    pendingPillText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    bodyText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    when: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    dismiss: { padding: 4 },
  });
}
