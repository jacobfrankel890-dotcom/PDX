import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { colors } from "../../constants/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.replace("/(app)/dashboard");
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>Parts Distribution Xpress</Text>
        <Text style={styles.sub}>Expense Report Portal</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button title="Sign In" onPress={handleLogin} loading={loading} />
        <Link href="/(auth)/signup" asChild>
          <Pressable>
            <Text style={styles.link}>Create an account</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24, gap: 16, flexGrow: 1, justifyContent: "center" },
  brand: { fontSize: 22, fontWeight: "700", color: colors.primary, textAlign: "center" },
  sub: { fontSize: 14, color: colors.slate500, textAlign: "center", marginBottom: 16 },
  error: { color: colors.error, backgroundColor: colors.errorBg, padding: 12, borderRadius: 8 },
  link: { color: colors.primary, textAlign: "center", fontWeight: "600", marginTop: 8 },
});
