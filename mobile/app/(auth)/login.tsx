import { useCallback, useEffect, useState } from "react";
import { Link, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";
import {
  getBiometricLabel,
  isBiometricLoginEnabled,
  offerBiometricSetupAfterLogin,
  signInWithBiometric,
} from "../../lib/biometric-auth";
import { useTheme } from "../../lib/settings-context";
import { AuthScreenShell } from "../../components/AuthScreenShell";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { spacing, type ThemeColors } from "../../constants/theme";

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
      title="Welcome back"
      subtitle="Sign in to submit and track expenses"
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

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    error: {
      color: colors.error,
      backgroundColor: colors.errorBg,
      padding: 12,
      borderRadius: 10,
      fontSize: 14,
      overflow: "hidden",
    },
    submitBtn: { marginTop: spacing.xs },
    footerLink: { color: colors.textSecondary, fontSize: 15 },
    footerLinkBold: { color: colors.primary, fontWeight: "700" },
  });
}
