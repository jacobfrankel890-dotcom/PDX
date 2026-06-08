import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { Dashboard } from "@/components/dashboard/dashboard";
import type { ExpenseReport, Profile } from "@/lib/types";

export default async function DashboardPage() {
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

  const { data: reports } = await supabase
    .from("expense_reports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <AppShell profile={profile as Profile}>
      <Dashboard
        reports={(reports as ExpenseReport[]) ?? []}
        userName={profile ? `${profile.first_name}` : "User"}
        region={profile?.region ?? "pdx"}
      />
    </AppShell>
  );
}
