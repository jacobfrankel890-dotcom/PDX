import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewReportPageClient from "./new-report-client";
import type { Profile } from "@/lib/types";

export default async function NewReportPage() {
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

  if (!profile) redirect("/signup");

  return <NewReportPageClient profile={profile as Profile} />;
}
