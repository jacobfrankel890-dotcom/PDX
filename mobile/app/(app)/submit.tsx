import { useCallback, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { SubmitExpenseForm } from "../../components/SubmitExpenseForm";
import type { Profile } from "../../lib/types";
import { colors } from "../../constants/theme";

export default function SubmitExpenseScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) {
          router.replace("/(auth)/welcome");
          return;
        }
        setUserId(user.id);
        const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setProfile(p as Profile);
      });
    }, [])
  );

  if (!userId || !profile) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <SubmitExpenseForm userId={userId} profile={profile} onSubmitted={() => router.back()} />;
}
