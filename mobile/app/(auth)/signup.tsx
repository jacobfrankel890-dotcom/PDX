import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { sendOtp, verifyOtp } from "../../lib/api";
import { REGIONS, ROLES } from "../../lib/types";
import { isValidEmail, isValidPhone, normalizePhone } from "../../lib/utils";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { colors } from "../../constants/theme";

type Step = "info" | "verify" | "role";

export default function SignupScreen() {
  const [step, setStep] = useState<Step>("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [devMode, setDevMode] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    otp: "",
    role: "kam" as string,
    region: "pdx" as string,
  });

  function update(field: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setError("");
  }

  async function handleSendOtp() {
    if (!form.firstName || !form.lastName) return setError("Name required");
    if (!isValidEmail(form.email)) return setError("Valid email required");
    if (!isValidPhone(form.phone)) return setError("Valid US phone required");
    if (form.password.length < 8) return setError("Password min 8 characters");
    if (form.password !== form.confirmPassword) return setError("Passwords don't match");

    setLoading(true);
    try {
      const res = await sendOtp(normalizePhone(form.phone));
      setDevMode(!!res.devMode);
      setStep("verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (form.otp.length !== 6) return setError("Enter 6-digit code");
    setLoading(true);
    try {
      await verifyOtp(normalizePhone(form.phone), form.otp);
      setPhoneVerified(true);
      setStep("role");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    if (!phoneVerified) return setError("Verify phone first");
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          phone: normalizePhone(form.phone),
          role: form.role,
          region: form.region,
          phone_verified: true,
        },
      },
    });
    setLoading(false);
    if (signUpError) return setError(signUpError.message);
    router.replace("/(app)/dashboard");
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {devMode && step === "verify" ? (
          <Text style={styles.dev}>Dev mode: use code 123456</Text>
        ) : null}

        {step === "info" && (
          <>
            <Input label="First Name" value={form.firstName} onChangeText={(v) => update("firstName", v)} />
            <Input label="Last Name" value={form.lastName} onChangeText={(v) => update("lastName", v)} />
            <Input label="Email" value={form.email} onChangeText={(v) => update("email", v)} autoCapitalize="none" keyboardType="email-address" />
            <Input label="Phone" value={form.phone} onChangeText={(v) => update("phone", v)} keyboardType="phone-pad" hint="SMS verification code will be sent" />
            <Input label="Password" value={form.password} onChangeText={(v) => update("password", v)} secureTextEntry />
            <Input label="Confirm Password" value={form.confirmPassword} onChangeText={(v) => update("confirmPassword", v)} secureTextEntry />
            <Button title="Verify Phone" onPress={handleSendOtp} loading={loading} />
          </>
        )}

        {step === "verify" && (
          <>
            <Text style={styles.hint}>Code sent to {form.phone}</Text>
            <Input label="6-Digit Code" value={form.otp} onChangeText={(v) => update("otp", v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" />
            <Button title="Verify Code" onPress={handleVerify} loading={loading} />
            <Button title="Back" variant="ghost" onPress={() => setStep("info")} />
          </>
        )}

        {step === "role" && (
          <>
            <Text style={styles.label}>Role</Text>
            {ROLES.map((r) => (
              <Pressable key={r.value} onPress={() => update("role", r.value)} style={[styles.option, form.role === r.value && styles.optionActive]}>
                <Text style={form.role === r.value ? styles.optionTextActive : styles.optionText}>{r.label}</Text>
              </Pressable>
            ))}
            <Text style={styles.label}>Region</Text>
            {REGIONS.map((r) => (
              <Pressable key={r.value} onPress={() => update("region", r.value)} style={[styles.option, form.region === r.value && styles.optionActive]}>
                <Text style={form.region === r.value ? styles.optionTextActive : styles.optionText}>
                  {r.label} — {r.description}
                </Text>
              </Pressable>
            ))}
            <Button title="Create Account" onPress={handleSignup} loading={loading} />
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
  error: { color: colors.error, backgroundColor: colors.errorBg, padding: 12, borderRadius: 8 },
  dev: { backgroundColor: "#dbeafe", padding: 10, borderRadius: 8, fontSize: 13 },
  hint: { color: colors.slate500, fontSize: 14 },
  label: { fontSize: 14, fontWeight: "600", color: colors.slate700, marginTop: 8 },
  option: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  optionActive: { borderColor: colors.primary, backgroundColor: "#e8eef5" },
  optionText: { color: colors.slate700 },
  optionTextActive: { color: colors.primary, fontWeight: "600" },
  link: { color: colors.primary, textAlign: "center", fontWeight: "600", marginTop: 16 },
});
