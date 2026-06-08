import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { supabase } from "../lib/supabase";
import { isBiometricLoginEnabled, signInWithBiometric } from "../lib/biometric-auth";
import { LandingSplash } from "../components/LandingSplash";

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
    return <LandingSplash />;
  }

  return <Redirect href={session ? "/(app)/(tabs)/dashboard" : "/(auth)/welcome"} />;
}
