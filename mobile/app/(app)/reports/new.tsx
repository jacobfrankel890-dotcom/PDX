import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { colors } from "../../constants/theme";

export default function NewReportScreen() {
  const today = new Date();
  const [start, setStart] = useState(format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"));
  const [end, setEnd] = useState(format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("expense_reports")
      .insert({ user_id: user.id, pay_period_start: start, pay_period_end: end, status: "draft" })
      .select()
      .single();
    setLoading(false);
    if (error) return Alert.alert("Error", error.message);
    router.replace(`/(app)/reports/${data.id}`);
  }

  return (
    <View style={styles.container}>
      <Input label="Pay Period Start" value={start} onChangeText={setStart} placeholder="YYYY-MM-DD" />
      <Input label="Pay Period End" value={end} onChangeText={setEnd} placeholder="YYYY-MM-DD" />
      <Button title="Create Report" onPress={create} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16, backgroundColor: colors.bg },
});
