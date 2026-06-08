"use client";

import Link from "next/link";
import { formatCurrency, getRegionLabel, type ExpenseReport } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Eye, FileText, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";

interface DashboardProps {
  reports: ExpenseReport[];
  userName: string;
  region: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export function Dashboard({ reports, userName, region }: DashboardProps) {
  const draftCount = reports.filter((r) => r.status === "draft").length;
  const submittedCount = reports.filter((r) => r.status === "submitted").length;
  const totalExpenses = reports
    .filter((r) => r.status !== "draft")
    .reduce((sum, r) => sum + Number(r.grand_total), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-pdx-blue">Welcome, {userName}</h1>
          <p className="text-slate-500 mt-1">{getRegionLabel(region as never)} Region</p>
        </div>
        <Link href="/reports/new">
          <Button size="lg">
            <Plus className="h-5 w-5" />
            New Expense Report
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md">
          <p className="text-sm text-slate-500">Draft Reports</p>
          <p className="text-3xl font-bold text-pdx-blue mt-1">{draftCount}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-slate-500">Submitted</p>
          <p className="text-3xl font-bold text-pdx-blue mt-1">{submittedCount}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-slate-500">Total Submitted</p>
          <p className="text-3xl font-bold text-pdx-green mt-1">{formatCurrency(totalExpenses)}</p>
        </Card>
      </div>

      {/* Reports list */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Your Reports</h2>
        {reports.length === 0 ? (
          <Card padding="lg" className="text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-700">No expense reports yet</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Create your first expense report to get started
            </p>
            <Link href="/reports/new">
              <Button>
                <Plus className="h-4 w-4" />
                Create Report
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <Card key={report.id} padding="md" className="hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-pdx-blue/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-pdx-blue" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">
                        {format(parseISO(report.pay_period_start), "MMM d")} –{" "}
                        {format(parseISO(report.pay_period_end), "MMM d, yyyy")}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {formatCurrency(Number(report.grand_total))} ·{" "}
                        {report.submitted_at
                          ? `Submitted ${format(parseISO(report.submitted_at), "MMM d, yyyy")}`
                          : "Not yet submitted"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium capitalize",
                        STATUS_STYLES[report.status]
                      )}
                    >
                      {report.status}
                    </span>
                    <Link href={`/reports/${report.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                        {report.status === "draft" ? "Edit" : "View"}
                      </Button>
                    </Link>
                    <a href={`/api/export?reportId=${report.id}`}>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
