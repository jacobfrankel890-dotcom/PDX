import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { ExpenseReportEditor } from "@/components/reports/expense-report-editor";
import type { ExpenseLineItem, ExpenseReport, Profile } from "@/lib/types";
import { DEFAULT_MILEAGE_RATE } from "@/lib/types";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: report, error } = await supabase
    .from("expense_reports")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !report) notFound();

  const { data: lineItems } = await supabase
    .from("expense_line_items")
    .select("*")
    .eq("report_id", id)
    .order("sort_order", { ascending: true });

  const { data: settings } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "mileage_rate")
    .single();

  const mileageRate = settings?.value ? parseFloat(settings.value) : DEFAULT_MILEAGE_RATE;

  return (
    <AppShell profile={profile as Profile}>
      <ExpenseReportEditor
        report={report as ExpenseReport}
        lineItems={(lineItems as ExpenseLineItem[]) ?? []}
        profile={profile as Profile}
        mileageRate={mileageRate}
      />
    </AppShell>
  );
}
