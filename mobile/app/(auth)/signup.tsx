import { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { offerBiometricSetupAfterLogin } from "../../lib/biometric-auth";
import { getPasswordValidationError } from "../../lib/password-requirements";
import { REGIONS, ROLES, getDefaultCompanyForRegion, type PdxRegion } from "../../lib/types";
import { isValidEmail } from "../../lib/utils";
import { AUTH_GRAY_60, AUTH_WHITE } from "../../constants/auth-chrome";
import { AuthScreenShell } from "../../components/AuthScreenShell";
import { SignupStepIndicator } from "../../components/SignupStepIndicator";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { PasswordRequirements } from "../../components/PasswordRequirements";
import { radius, spacing } from "../../constants/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Step = "account" | "role";

const STEP_LABELS = ["Your account", "Role & region"];

export default function SignupScreen() {
  const styles = makeStyles();
  const [step, setStep] = useState<Step>("account");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "kam" as string,
    region: "pdx" as string,
  });

  function update(field: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setError("");
    setSuccess("");
  }

  function goToStep(next: Step) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(next);
  }

  function validateAccount(): boolean {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required");
      return false;
    }
    if (!isValidEmail(form.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    const passwordError = getPasswordValidationError(form.password, form.confirmPassword);
    if (passwordError) {
      setError(passwordError);
      return false;
    }
    return true;
  }

  async function handleSignup() {
    if (!form.role || !form.region) {
      setError("Please select your role and region");
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          role: form.role,
          region: form.region,
          company: getDefaultCompanyForRegion(form.region as PdxRegion),
          phone_verified: false,
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      await offerBiometricSetupAfterLogin();
      router.replace("/(app)/(tabs)/dashboard");
      return;
    }

    goToStep("account");
    setSuccess("Account created! Check your email to confirm, then sign in.");
  }

  const stepIndex = step === "account" ? 0 : 1;

  return (
    <AuthScreenShell
      sectionLabel="New account"
      badge="For PDX teams"
      title="Create account"
      subtitle="Join PDX Expense in under a minute"
      showTrust={false}
      compactHero
      scrollKey={step}
      footer={
        <Link href="/(auth)/login" asChild>
          <Pressable hitSlop={8}>
            <Text style={styles.footerLink}>
              Already have an account? <Text style={styles.footerLinkBold}>Sign in</Text>
            </Text>
          </Pressable>
        </Link>
      }
    >
      <SignupStepIndicator tone="auth" step={stepIndex} total={2} labels={STEP_LABELS} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      {step === "account" ? (
        <View style={styles.step}>
          <Input tone="auth" label="First name" value={form.firstName} onChangeText={(v) => update("firstName", v)} autoComplete="given-name" />
          <Input tone="auth" label="Last name" value={form.lastName} onChangeText={(v) => update("lastName", v)} autoComplete="family-name" />
          <Input
            tone="auth"
            label="Email"
            value={form.email}
            onChangeText={(v) => update("email", v)}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input
            tone="auth"
            label="Password"
            value={form.password}
            onChangeText={(v) => update("password", v)}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            scrollMode="top"
          />
          <PasswordRequirements password={form.password} />
          <Input
            tone="auth"
            label="Confirm password"
            value={form.confirmPassword}
            onChangeText={(v) => update("confirmPassword", v)}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            scrollMode="top"
          />
          <PasswordRequirements password={form.password} confirmPassword={form.confirmPassword} showMatch />
          <Button
            title="Continue"
            onPress={() => {
              if (validateAccount()) goToStep("role");
            }}
          />
        </View>
      ) : (
        <View style={styles.step}>
          <Text style={styles.fieldLabel}>Your role</Text>
          <View style={styles.optionList}>
            {ROLES.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => update("role", r.value)}
                style={[styles.option, form.role === r.value && styles.optionActive]}
              >
                <Text style={form.role === r.value ? styles.optionTextActive : styles.optionText}>{r.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Your region</Text>
          <View style={styles.optionList}>
            {REGIONS.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => update("region", r.value)}
                style={[styles.option, form.region === r.value && styles.optionActive]}
              >
                <Text style={form.region === r.value ? styles.optionTextActive : styles.optionText}>
                  {r.label} — {r.description}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.row}>
            <Button title="Back" variant="ghost" onPress={() => goToStep("account")} style={styles.half} />
            <Button title="Create account" onPress={handleSignup} loading={loading} style={styles.half} />
          </View>
        </View>
      )}
    </AuthScreenShell>
  );
}

function makeStyles() {
  return StyleSheet.create({
    step: { gap: spacing.md },
    error: {
      color: "#F87171",
      backgroundColor: "rgba(127,29,29,0.35)",
      padding: 12,
      borderRadius: 12,
      fontSize: 14,
    },
    success: {
      color: "#99C221",
      backgroundColor: "rgba(42,51,24,0.6)",
      padding: 12,
      borderRadius: 12,
      fontSize: 14,
    },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: AUTH_WHITE, marginBottom: spacing.xs },
    optionList: { gap: spacing.md },
    option: {
      padding: 14,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      backgroundColor: "rgba(255,255,255,0.06)",
    },
    optionActive: { borderColor: "#99C221", backgroundColor: "rgba(42,51,24,0.5)" },
    optionText: { color: "rgba(255,255,255,0.85)", fontSize: 15 },
    optionTextActive: { color: "#99C221", fontWeight: "600", fontSize: 15 },
    row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
    half: { flex: 1 },
    footerLink: { color: AUTH_GRAY_60, fontSize: 15, lineHeight: 22, textAlign: "center" },
    footerLinkBold: { color: "#99C221", fontWeight: "700" },
  });
}
