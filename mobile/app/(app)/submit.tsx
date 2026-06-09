import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { SubmitExpenseForm, type ExpensePrefillDraft } from "../../components/SubmitExpenseForm";
import type { Profile } from "../../lib/types";
import { useTheme } from "../../lib/settings-context";

function buildPrefill(params: Record<string, string | string[] | undefined>): ExpensePrefillDraft | undefined {
  if (params.prefill !== "1") return undefined;

  const pick = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };

  const draft: ExpensePrefillDraft = {
    merchant: pick("merchant"),
    amount: pick("amount"),
    expenseDate: pick("date"),
    relatedTo: pick("note"),
    reminderId: pick("reminderId"),
  };

  if (!draft.merchant && !draft.amount && !draft.reminderId) return undefined;
  return draft;
}

export default function SubmitExpenseScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    prefill?: string;
    merchant?: string;
    amount?: string;
    date?: string;
    note?: string;
    reminderId?: string;
  }>();
  const prefill = useMemo(() => buildPrefill(params), [params]);

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

  return (
    <SubmitExpenseForm
      userId={userId}
      profile={profile}
      prefill={prefill}
      onSubmitted={() => router.back()}
    />
  );
}
