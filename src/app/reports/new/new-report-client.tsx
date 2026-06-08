"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Profile } from "@/lib/types";
import { startOfWeek, endOfWeek, format } from "date-fns";

interface NewReportPageProps {
  profile: Profile;
}

function NewReportForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date();
  const defaultStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const defaultEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const [payPeriodStart, setPayPeriodStart] = useState(defaultStart);
  const [payPeriodEnd, setPayPeriodEnd] = useState(defaultEnd);

  async function createReport() {
    if (!payPeriodStart || !payPeriodEnd) {
      setError("Please select a pay period");
      return;
    }
    if (payPeriodEnd < payPeriodStart) {
      setError("End date must be after start date");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("expense_reports")
        .insert({
          user_id: profile.id,
          pay_period_start: payPeriodStart,
          pay_period_end: payPeriodEnd,
          status: "draft",
        })
        .select()
        .single();

      if (insertError) throw insertError;
      router.push(`/reports/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create report");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padding="lg" className="max-w-lg">
      <CardHeader>
        <CardTitle>New Expense Report</CardTitle>
        <CardDescription>Select the pay period for this expense report</CardDescription>
      </CardHeader>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <Input
          label="Pay Period Start"
          type="date"
          value={payPeriodStart}
          onChange={(e) => setPayPeriodStart(e.target.value)}
        />
        <Input
          label="Pay Period End"
          type="date"
          value={payPeriodEnd}
          onChange={(e) => setPayPeriodEnd(e.target.value)}
        />
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => router.back()} className="flex-1">
            Cancel
          </Button>
          <Button onClick={createReport} loading={loading} className="flex-1">
            Create Report
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function NewReportPageClient({ profile }: NewReportPageProps) {
  return (
    <AppShell profile={profile}>
      <NewReportForm profile={profile} />
    </AppShell>
  );
}
