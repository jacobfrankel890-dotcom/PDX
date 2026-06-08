import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { supabase } from "../lib/supabase";
import { isBiometricLoginEnabled, signInWithBiometric } from "../lib/biometric-auth";
import { colors } from "../constants/theme";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (!cancelled) {
          setSession(true);
          setReady(true);
        }
        return;
      }

      if (await isBiometricLoginEnabled()) {
        const result = await signInWithBiometric();
        if (!cancelled) {
          setSession(result.ok);
          setReady(true);
          return;
        }
      }

      if (!cancelled) {
        setSession(false);
        setReady(true);
      }
    }

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(!!s);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={session ? "/(app)/dashboard" : "/(auth)/login"} />;
}
