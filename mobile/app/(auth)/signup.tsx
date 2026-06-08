import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { REGIONS, ROLES, getDefaultCompanyForRegion, type PdxRegion } from "../../lib/types";
import { isValidEmail } from "../../lib/utils";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { colors } from "../../constants/theme";

type Step = "account" | "role";

export default function SignupScreen() {
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
      router.replace("/(app)/dashboard");
      return;
    }

    setStep("account");
    setSuccess("Account created! Check your email to confirm, then sign in.");
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Parts Distribution Xpress</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        {step === "account" && (
          <>
            <Input label="First Name" value={form.firstName} onChangeText={(v) => update("firstName", v)} />
            <Input label="Last Name" value={form.lastName} onChangeText={(v) => update("lastName", v)} />
            <Input
              label="Email"
              value={form.email}
              onChangeText={(v) => update("email", v)}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Input label="Password" value={form.password} onChangeText={(v) => update("password", v)} secureTextEntry />
            <Input
              label="Confirm Password"
              value={form.confirmPassword}
              onChangeText={(v) => update("confirmPassword", v)}
              secureTextEntry
            />
            <Button
              title="Continue"
              onPress={() => {
                if (validateAccount()) setStep("role");
              }}
            />
          </>
        )}

        {step === "role" && (
          <>
            <Text style={styles.label}>Your Role</Text>
            {ROLES.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => update("role", r.value)}
                style={[styles.option, form.role === r.value && styles.optionActive]}
              >
                <Text style={form.role === r.value ? styles.optionTextActive : styles.optionText}>{r.label}</Text>
              </Pressable>
            ))}
            <Text style={styles.label}>Your Region</Text>
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
            <View style={styles.row}>
              <Button title="Back" variant="ghost" onPress={() => setStep("account")} style={styles.half} />
              <Button title="Create Account" onPress={handleSignup} loading={loading} style={styles.half} />
            </View>
          </>
        )}

        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text style={styles.link}>Already have an account? Sign in</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24, gap: 12, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", color: colors.primary, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.slate500, textAlign: "center", marginBottom: 8 },
  error: { color: colors.error, backgroundColor: colors.errorBg, padding: 12, borderRadius: 8 },
  success: { color: colors.primary, backgroundColor: "#e8eef5", padding: 12, borderRadius: 8 },
  label: { fontSize: 14, fontWeight: "600", color: colors.slate700, marginTop: 8 },
  option: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  optionActive: { borderColor: colors.primary, backgroundColor: "#e8eef5" },
  optionText: { color: colors.slate700 },
  optionTextActive: { color: colors.primary, fontWeight: "600" },
  row: { flexDirection: "row", gap: 10, marginTop: 8 },
  half: { flex: 1 },
  link: { color: colors.primary, textAlign: "center", fontWeight: "600", marginTop: 16 },
});
