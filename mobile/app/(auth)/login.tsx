import { useCallback, useEffect, useState } from "react";
import { Link, router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { supabase } from "../../lib/supabase";
import {
  getBiometricLabel,
  isBiometricLoginEnabled,
  offerBiometricSetupAfterLogin,
  signInWithBiometric,
} from "../../lib/biometric-auth";
import { AUTH_GRAY_60 } from "../../constants/auth-chrome";
import { AuthScreenShell } from "../../components/AuthScreenShell";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { spacing } from "../../constants/theme";

export default function LoginScreen() {
  const styles = makeStyles();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState("");
  const [biometricLabel, setBiometricLabel] = useState("Biometrics");
  const [showBiometric, setShowBiometric] = useState(false);

  useEffect(() => {
    isBiometricLoginEnabled().then(setShowBiometric);
    getBiometricLabel().then(setBiometricLabel);
  }, []);

  const goToApp = useCallback(async () => {
    await offerBiometricSetupAfterLogin();
    router.replace("/(app)/(tabs)/dashboard");
  }, []);

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    await goToApp();
  }

  async function handleBiometricLogin() {
    setBiometricLoading(true);
    setError("");
    const result = await signInWithBiometric();
    setBiometricLoading(false);
    if (!result.ok) {
      if (result.error && result.error !== "Authentication cancelled") {
        setError(result.error);
      }
      return;
    }
    router.replace("/(app)/(tabs)/dashboard");
  }

  return (
    <AuthScreenShell
      sectionLabel="Returning user"
      title="Welcome back"
      subtitle="Sign in to submit and track expenses"
      showTrust={false}
      compactHero
      footer={
        <Link href="/(auth)/signup" asChild>
          <Pressable hitSlop={8}>
            <Text style={styles.footerLink}>
              New here? <Text style={styles.footerLinkBold}>Create an account</Text>
            </Text>
          </Pressable>
        </Link>
      }
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {showBiometric ? (
        <Button
          title={`Sign in with ${biometricLabel}`}
          variant="outline"
          onPress={handleBiometricLogin}
          loading={biometricLoading}
        />
      ) : null}

      <Input
        label="Email"
        tone="auth"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <Input
        label="Password"
        tone="auth"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={handleLogin}
      />
      <Button title="Sign In" onPress={handleLogin} loading={loading} style={styles.submitBtn} />
    </AuthScreenShell>
  );
}

function makeStyles() {
  return StyleSheet.create({
    error: {
      color: "#F87171",
      backgroundColor: "rgba(127,29,29,0.35)",
      padding: 12,
      borderRadius: 12,
      fontSize: 14,
      overflow: "hidden",
    },
    submitBtn: { marginTop: spacing.sm },
    footerLink: { color: AUTH_GRAY_60, fontSize: 15 },
    footerLinkBold: { color: "#99C221", fontWeight: "700" },
  });
}
