import Link from "next/link";
import { Users, IndianRupee, CalendarCheck, UserPlus, Banknote, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getStats } from "@/server/services/dashboard";
import { reportInstallments } from "@/server/services/reports";
import { syncMembershipStatuses } from "@/server/services/membership-status";
import { PageHeader } from "@/components/layout/page-header";
import { formatPaiseShort } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

type Variant = "emerald" | "sky" | "violet" | "amber" | "rose";

const VARIANT_STYLES: Record<
  Variant,
  {
    bg: string;
    iconTile: string;
    blob: string;
    accent: string;
    statBg: string;
    statText: string;
    border: string;
  }
> = {
  emerald: {
    bg: "from-emerald-500/[0.08] to-transparent",
    iconTile:
      "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30",
    blob: "bg-emerald-400 dark:bg-emerald-500",
    accent: "from-emerald-500 to-emerald-300",
    statBg: "bg-emerald-500/15",
    statText: "text-emerald-700 dark:text-emerald-300",
    border: "hover:border-emerald-400/60",
  },
  sky: {
    bg: "from-sky-500/[0.08] to-transparent",
    iconTile: "bg-gradient-to-br from-sky-400 to-sky-600 shadow-sky-500/30",
    blob: "bg-sky-400 dark:bg-sky-500",
    accent: "from-sky-500 to-sky-300",
    statBg: "bg-sky-500/15",
    statText: "text-sky-700 dark:text-sky-300",
    border: "hover:border-sky-400/60",
  },
  violet: {
    bg: "from-violet-500/[0.08] to-transparent",
    iconTile: "bg-gradient-to-br from-violet-400 to-violet-600 shadow-violet-500/30",
    blob: "bg-violet-400 dark:bg-violet-500",
    accent: "from-violet-500 to-violet-300",
    statBg: "bg-violet-500/15",
    statText: "text-violet-700 dark:text-violet-300",
    border: "hover:border-violet-400/60",
  },
  amber: {
    bg: "from-amber-500/[0.08] to-transparent",
    iconTile: "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30",
    blob: "bg-amber-400 dark:bg-amber-500",
    accent: "from-amber-500 to-amber-300",
    statBg: "bg-amber-500/15",
    statText: "text-amber-700 dark:text-amber-300",
    border: "hover:border-amber-400/60",
  },
  rose: {
    bg: "from-rose-500/[0.08] to-transparent",
    iconTile: "bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/30",
    blob: "bg-rose-400 dark:bg-rose-500",
    accent: "from-rose-500 to-rose-300",
    statBg: "bg-rose-500/15",
    statText: "text-rose-700 dark:text-rose-300",
    border: "hover:border-rose-400/60",
  },
};

export default async function ReportsHubPage() {
  const session = await requirePermission("reports:read");
  await syncMembershipStatuses();

  // Fetch live stats for each report card
  const [stats, installments] = await Promise.all([
    getStats(),
    reportInstallments(session.user.gymId),
  ]);

  const overdueCount = installments.filter((i) => new Date(i.dueDate) < new Date()).length;
  const conversionRate =
    stats.totalLeads > 0
      ? Math.round((stats.convertedLeads / stats.totalLeads) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Operational reports for the gym. Every report has CSV export for sharing or accounting."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ReportCard
          variant="emerald"
          href="/reports/members"
          icon={Users}
          title="Members report"
          description="Active, expiring, expired, frozen, pending — with full contact details. Filter by status."
          statLabel="Total members"
          statValue={String(stats.totalMembers)}
          statHint={`${stats.activeMembers} active`}
        />

        <ReportCard
          variant="sky"
          href="/reports/revenue"
          icon={IndianRupee}
          title="Revenue report"
          description="Total payments, GST collected, breakdown by mode, 6-month trend."
          statLabel="This month"
          statValue={formatPaiseShort(stats.monthRevenuePaise)}
          statHint="Filterable by date"
        />

        <ReportCard
          variant="violet"
          href="/reports/attendance"
          icon={CalendarCheck}
          title="Attendance report"
          description="Per-member attendance counts and daily totals across any date range."
          statLabel="Today's check-ins"
          statValue={String(stats.todayAttendance)}
          statHint={
            stats.activeMembers > 0
              ? `${Math.round((stats.todayAttendance / stats.activeMembers) * 100)}% of active`
              : "—"
          }
        />

        <ReportCard
          variant="amber"
          href="/reports/leads"
          icon={UserPlus}
          title="Lead conversion"
          description="Funnel by status, source breakdown, conversion rate."
          statLabel="Conversion rate"
          statValue={`${conversionRate}%`}
          statHint={`${stats.convertedLeads} of ${stats.totalLeads} converted`}
        />

        <ReportCard
          variant="rose"
          href="/reports/installments"
          icon={Banknote}
          title="Installments due"
          description="Pending annual-plan installments sorted by due date — find who to call."
          statLabel="Pending"
          statValue={String(installments.length)}
          statHint={overdueCount > 0 ? `${overdueCount} overdue` : "All on schedule"}
          urgent={overdueCount > 0}
        />
      </div>
    </div>
  );
}

function ReportCard({
  variant,
  href,
  icon: Icon,
  title,
  description,
  statLabel,
  statValue,
  statHint,
  urgent,
}: {
  variant: Variant;
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  statLabel: string;
  statValue: string;
  statHint?: string;
  urgent?: boolean;
}) {
  const v = VARIANT_STYLES[variant];

  return (
    <Link
      href={href as never}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-gradient-to-br bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg",
        v.bg,
        v.border,
      )}
    >
      {/* Decorative blob */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full opacity-20 blur-3xl transition-opacity duration-300 group-hover:opacity-30",
          v.blob,
        )}
      />
      {/* Accent line on the left edge */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 top-6 bottom-6 w-1 rounded-r bg-gradient-to-b transition-all duration-300 group-hover:top-4 group-hover:bottom-4",
          v.accent,
        )}
      />

      <div className="relative flex h-full flex-col">
        {/* Icon tile + arrow */}
        <div className="mb-4 flex items-start justify-between">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg transition-transform duration-300 group-hover:scale-105",
              v.iconTile,
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground" />
        </div>

        {/* Title + description */}
        <h3 className="mb-1 text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>

        {/* Stat preview */}
        <div className="mt-5 flex items-baseline gap-2 border-t border-border/60 pt-4">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {statLabel}
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className={cn("text-2xl font-bold tabular-nums", v.statText)}>
                {statValue}
              </span>
              {statHint && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    urgent
                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                      : `${v.statBg} ${v.statText}`,
                  )}
                >
                  {statHint}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
