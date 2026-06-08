"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REGIONS, ROLES } from "@/lib/types";
import { isValidEmail } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Shield, UserPlus } from "lucide-react";

type Step = "account" | "role";

export function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    region: "",
  });

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
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
    setError("");

    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            role: form.role,
            region: form.region,
            phone_verified: false,
          },
        },
      });

      if (signUpError) throw signUpError;

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: "account", label: "Your Info", icon: <UserPlus className="h-4 w-4" /> },
    { key: "role", label: "Role & Region", icon: <Shield className="h-4 w-4" /> },
  ];

  const currentStepIndex = step === "account" ? 0 : 1;

  return (
    <Card padding="lg" className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Create Your Account</CardTitle>
        <CardDescription>Join Parts Distribution Xpress expense reporting</CardDescription>
      </CardHeader>

      <div className="flex items-center justify-between mb-8">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div
              className={`flex items-center gap-1.5 text-xs font-medium ${
                i <= currentStepIndex ? "text-pdx-blue" : "text-slate-400"
              }`}
            >
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  i < currentStepIndex ? "bg-pdx-green text-white" : i === currentStepIndex ? "bg-pdx-blue text-white" : "bg-slate-100 text-slate-400"
                }`}
              >
                {s.icon}
              </div>
              <span className="hidden sm:block">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 sm:w-16 h-0.5 mx-2 ${i < currentStepIndex ? "bg-pdx-green" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {step === "account" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required />
            <Input label="Last Name" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
          <Input label="Password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required />
          <Input label="Confirm Password" type="password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} required />
          <Button
            className="w-full"
            onClick={() => {
              if (validateAccount()) setStep("role");
            }}
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === "role" && (
        <div className="space-y-4">
          <Select
            label="Your Role"
            value={form.role}
            onChange={(e) => update("role", e.target.value)}
            options={ROLES.map((r) => ({ value: r.value, label: r.label }))}
            placeholder="Select your role..."
          />
          <Select
            label="Your Region"
            value={form.region}
            onChange={(e) => update("region", e.target.value)}
            options={REGIONS.map((r) => ({ value: r.value, label: r.label, description: r.description }))}
            placeholder="Select your region..."
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("account")} className="flex-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleSignup} loading={loading} className="flex-1">
              Create Account
            </Button>
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="text-pdx-blue font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
