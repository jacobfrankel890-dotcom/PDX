"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getRegionLabel, getRoleLabel, type Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FileText, LayoutDashboard, LogOut, Plus, User } from "lucide-react";

interface AppShellProps {
  profile: Profile | null;
  children: React.ReactNode;
}

export function AppShell({ profile, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/reports/new", label: "New Report", icon: Plus },
  ];

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-pdx-blue text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                <span className="font-bold text-lg hidden sm:block">PDX Expense Reports</span>
                <span className="font-bold text-lg sm:hidden">PDX</span>
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      pathname.startsWith(href)
                        ? "bg-white/20 text-white"
                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            {profile && (
              <div className="flex items-center gap-4">
                <div className="hidden sm:block text-right text-sm">
                  <p className="font-medium">
                    {profile.first_name} {profile.last_name}
                  </p>
                  <p className="text-blue-200 text-xs">
                    {getRoleLabel(profile.role)} · {getRegionLabel(profile.region)}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
