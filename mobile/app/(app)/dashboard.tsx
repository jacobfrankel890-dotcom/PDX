import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { format, parseISO } from "date-fns";
import { supabase } from "../../lib/supabase";
import { formatCurrency, getRegionLabel, type ExpenseReport, type Profile } from "../../lib/types";
import { Button } from "../../components/Button";
import { colors } from "../../constants/theme";

export default function DashboardScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const { data: r } = await supabase.from("expense_reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setProfile(p as Profile);
    setReports((r as ExpenseReport[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome, {profile?.first_name}</Text>
        <Text style={styles.region}>{profile ? getRegionLabel(profile.region) : ""}</Text>
        <Button title="New Expense Report" onPress={() => router.push("/(app)/reports/new")} />
        <Button title="Sign Out" variant="ghost" onPress={signOut} />
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={<Text style={styles.empty}>No reports yet. Create your first one.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/(app)/reports/${item.id}`)}>
            <View>
              <Text style={styles.rowTitle}>
                {format(parseISO(item.pay_period_start), "MMM d")} – {format(parseISO(item.pay_period_end), "MMM d, yyyy")}
              </Text>
              <Text style={styles.rowSub}>
                {formatCurrency(Number(item.grand_total))} · {item.status}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: 16, gap: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  welcome: { fontSize: 20, fontWeight: "700", color: colors.primary },
  region: { fontSize: 14, color: colors.slate500, marginBottom: 8 },
  list: { padding: 16, gap: 10 },
  empty: { textAlign: "center", color: colors.slate500, marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowTitle: { fontSize: 16, fontWeight: "600", color: colors.slate800 },
  rowSub: { fontSize: 13, color: colors.slate500, marginTop: 4 },
  chevron: { fontSize: 24, color: colors.slate500 },
});
