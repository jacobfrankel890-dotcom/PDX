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
import { REGIONS, ROLES, getDefaultCompanyForRegion, type PdxRegion } from "../../lib/types";
import { isValidEmail } from "../../lib/utils";
import { useTheme } from "../../lib/settings-context";
import { AuthScreenShell } from "../../components/AuthScreenShell";
import { SignupStepIndicator } from "../../components/SignupStepIndicator";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { radius, spacing, type ThemeColors } from "../../constants/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Step = "account" | "role";

const STEP_LABELS = ["Your account", "Role & region"];

export default function SignupScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
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
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
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
      router.replace("/(app)/(tabs)/dashboard");
      return;
    }

    goToStep("account");
    setSuccess("Account created! Check your email to confirm, then sign in.");
  }

  const stepIndex = step === "account" ? 0 : 1;

  return (
    <AuthScreenShell
      title="Create account"
      subtitle="Join PDX Expense in under a minute"
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
      <SignupStepIndicator step={stepIndex} total={2} labels={STEP_LABELS} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      {step === "account" ? (
        <View style={styles.step}>
          <Input label="First name" value={form.firstName} onChangeText={(v) => update("firstName", v)} autoComplete="given-name" />
          <Input label="Last name" value={form.lastName} onChangeText={(v) => update("lastName", v)} autoComplete="family-name" />
          <Input
            label="Email"
            value={form.email}
            onChangeText={(v) => update("email", v)}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input label="Password" value={form.password} onChangeText={(v) => update("password", v)} secureTextEntry autoComplete="new-password" />
          <Input
            label="Confirm password"
            value={form.confirmPassword}
            onChangeText={(v) => update("confirmPassword", v)}
            secureTextEntry
            autoComplete="new-password"
          />
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

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    step: { gap: spacing.md },
    error: {
      color: colors.error,
      backgroundColor: colors.errorBg,
      padding: 12,
      borderRadius: 10,
      fontSize: 14,
    },
    success: {
      color: colors.primary,
      backgroundColor: isDark ? "#2A3318" : colors.greenLight,
      padding: 12,
      borderRadius: 10,
      fontSize: 14,
    },
    fieldLabel: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: -4 },
    optionList: { gap: spacing.sm },
    option: {
      padding: 14,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    optionActive: { borderColor: colors.primary, backgroundColor: colors.greenLight },
    optionText: { color: colors.text, fontSize: 15 },
    optionTextActive: { color: colors.primary, fontWeight: "600", fontSize: 15 },
    row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
    half: { flex: 1 },
    footerLink: { color: colors.textSecondary, fontSize: 15 },
    footerLinkBold: { color: colors.primary, fontWeight: "700" },
  });
}
