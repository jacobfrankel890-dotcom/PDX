"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REGIONS, ROLES } from "@/lib/types";
import { isValidEmail, isValidPhone, normalizePhone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, CheckCircle, Phone, Shield, UserPlus } from "lucide-react";

type Step = "info" | "phone" | "verify" | "role";

export function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devMode, setDevMode] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    otp: "",
    role: "",
    region: "",
  });

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  function validateInfo(): boolean {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required");
      return false;
    }
    if (!isValidEmail(form.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!isValidPhone(form.phone)) {
      setError("Please enter a valid 10-digit US phone number");
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

  async function sendOtp() {
    if (!validateInfo()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(form.phone) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setDevMode(!!data.devMode);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (form.otp.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(form.phone), code: form.otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      setPhoneVerified(true);
      setStep("role");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    if (!form.role || !form.region) {
      setError("Please select your role and region");
      return;
    }
    if (!phoneVerified) {
      setError("Phone verification required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
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
    { key: "info", label: "Your Info", icon: <UserPlus className="h-4 w-4" /> },
    { key: "verify", label: "Verify Phone", icon: <Phone className="h-4 w-4" /> },
    { key: "role", label: "Role & Region", icon: <Shield className="h-4 w-4" /> },
  ];

  const currentStepIndex = step === "info" ? 0 : step === "verify" || step === "phone" ? 1 : 2;

  return (
    <Card padding="lg" className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Create Your Account</CardTitle>
        <CardDescription>
          Join Parts Distribution Xpress expense reporting
        </CardDescription>
      </CardHeader>

      {/* Progress steps */}
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
                  i < currentStepIndex
                    ? "bg-pdx-green text-white"
                    : i === currentStepIndex
                      ? "bg-pdx-blue text-white"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {i < currentStepIndex ? <CheckCircle className="h-4 w-4" /> : s.icon}
              </div>
              <span className="hidden sm:block">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 sm:w-16 h-0.5 mx-2 ${
                  i < currentStepIndex ? "bg-pdx-green" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {step === "info" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              placeholder="John"
              required
            />
            <Input
              label="Last Name"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              placeholder="Smith"
              required
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@company.com"
            required
          />
          <Input
            label="Phone Number"
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="(555) 123-4567"
            hint="We'll send a verification code via SMS"
            required
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="Min. 8 characters"
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            required
          />
          <Button className="w-full" onClick={sendOtp} loading={loading}>
            Continue to Phone Verification
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === "verify" && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
            <p>
              We sent a 6-digit code to <strong>{form.phone}</strong>
            </p>
            {devMode && (
              <p className="mt-2 font-mono text-xs bg-blue-100 p-2 rounded">
                Dev mode: use code <strong>123456</strong>
              </p>
            )}
          </div>
          <Input
            label="Verification Code"
            value={form.otp}
            onChange={(e) => update("otp", e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="text-center text-2xl tracking-widest font-mono"
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("info")} className="flex-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={verifyOtp} loading={loading} className="flex-1">
              Verify Code
            </Button>
          </div>
          <button
            type="button"
            onClick={sendOtp}
            disabled={loading}
            className="w-full text-sm text-pdx-blue hover:underline"
          >
            Didn&apos;t receive a code? Resend
          </button>
        </div>
      )}

      {step === "role" && (
        <div className="space-y-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-800">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Phone verified successfully
          </div>
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
            options={REGIONS.map((r) => ({
              value: r.value,
              label: r.label,
              description: r.description,
            }))}
            placeholder="Select your region..."
          />
          <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
            <p className="font-medium text-slate-700">Region Guide:</p>
            <p>CPX — Canada · PDX North — Northeast US · APX — All Parts Xpress</p>
            <p>PDX — Core territory · PDX South — Southeast · PDX West — Northwest</p>
            <p>APX California — Southwest US / California</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("verify")} className="flex-1">
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
