import { useCallback, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { ExpenseReportEditor } from "../../../components/ExpenseReportEditor";
import type { ExpenseLineItem, ExpenseReport, Profile } from "../../../lib/types";
import { colors } from "../../../constants/theme";

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [items, setItems] = useState<ExpenseLineItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }
    const [{ data: r }, { data: p }, { data: li }] = await Promise.all([
      supabase.from("expense_reports").select("*").eq("id", id).eq("user_id", user.id).single(),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("expense_line_items").select("*").eq("report_id", id).order("sort_order"),
    ]);
    setReport(r as ExpenseReport);
    setProfile(p as Profile);
    setItems((li as ExpenseLineItem[]) ?? []);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  if (loading || !report || !profile) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ExpenseReportEditor
      report={report}
      initialItems={items}
      profile={profile}
      onSaved={() => {
        load();
        router.back();
      }}
    />
  );
}
