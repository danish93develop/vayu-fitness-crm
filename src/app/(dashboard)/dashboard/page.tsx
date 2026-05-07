import {
  Users,
  CalendarCheck,
  AlertTriangle,
  Snowflake,
  IndianRupee,
  UserPlus,
  TrendingUp,
  ClipboardList,
  Activity,
} from "lucide-react";
import { requireAuth } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { formatPaiseShort } from "@/lib/money";
import { greeting, format } from "@/lib/date";
import { syncMembershipStatuses } from "@/server/services/membership-status";
import {
  getStats,
  getRevenueByMonth,
  getMemberStatusBreakdown,
  getRecentPayments,
  getRecentLeads,
  getUpcomingExpiries,
  getInstallmentDues,
  getAlerts,
  getTodayActivity,
} from "@/server/services/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SectionLabel } from "@/components/dashboard/section-label";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { MemberStatusChart } from "@/components/dashboard/member-status-chart";
import { RecentPayments } from "@/components/dashboard/recent-payments";
import { RecentLeads } from "@/components/dashboard/recent-leads";
import { UpcomingExpiries } from "@/components/dashboard/upcoming-expiries";
import { InstallmentDues } from "@/components/dashboard/installment-dues";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAuth();
  await syncMembershipStatuses();

  const role = session.user.role;

  // Per-role permission flags — single source for what to show on the page
  const canSeeRevenue = can(role, "payments:read");
  const canSeeLeads = can(role, "leads:read");
  const canSeeFreezes = can(role, "memberships:freeze:approve");
  const canSeePayments = can(role, "payments:read");
  const canSeeMembers = can(role, "members:read");
  const canCreateMember = can(role, "members:create");
  const hasQuickActions =
    can(role, "payments:create") ||
    can(role, "attendance:mark") ||
    canCreateMember ||
    can(role, "classes:create");

  const [stats, todayActivity, revenue, statusBreakdown, payments, leads, expiries, installments, alerts] =
    await Promise.all([
      getStats(),
      getTodayActivity(),
      canSeeRevenue ? getRevenueByMonth(6) : Promise.resolve([]),
      getMemberStatusBreakdown(),
      canSeePayments ? getRecentPayments(5) : Promise.resolve([]),
      canSeeLeads ? getRecentLeads(5) : Promise.resolve([]),
      getUpcomingExpiries(5),
      canSeePayments ? getInstallmentDues(5) : Promise.resolve([]),
      getAlerts(role ? session.user.gymId : undefined, session.user.id),
    ]);

  const firstName = session.user.name?.split(" ")[0] ?? "there";
  const today = new Date();

  // Today section cards — filtered
  const todayCards: React.ReactNode[] = [];
  if (canSeeRevenue) {
    todayCards.push(
      <StatCard
        key="sales"
        label="Today's sales"
        value={formatPaiseShort(todayActivity.salesPaise)}
        icon={IndianRupee}
        tone="accent"
        hint={
          todayActivity.paymentsCount === 0
            ? "No payments yet"
            : `${todayActivity.paymentsCount} payment${todayActivity.paymentsCount === 1 ? "" : "s"}`
        }
        highlight
      />,
    );
  }
  if (canCreateMember) {
    todayCards.push(
      <StatCard
        key="newMembers"
        label="New members today"
        value={todayActivity.newMembers}
        icon={UserPlus}
        tone="primary"
        hint={todayActivity.newMembers === 0 ? "—" : "Joined today"}
      />,
    );
  }
  if (canSeeLeads) {
    todayCards.push(
      <StatCard
        key="newLeads"
        label="New leads today"
        value={todayActivity.newLeads}
        icon={UserPlus}
        tone="primary"
        hint={todayActivity.newLeads === 0 ? "—" : "Added today"}
      />,
    );
  }
  todayCards.push(
    <StatCard
      key="checkins"
      label="Check-ins today"
      value={todayActivity.checkIns}
      icon={CalendarCheck}
      tone="accent"
      hint={
        stats.activeMembers > 0
          ? `${Math.round((todayActivity.checkIns / stats.activeMembers) * 100)}% of active`
          : "—"
      }
    />,
  );

  // Overview section cards — filtered
  const overviewCards: React.ReactNode[] = [
    <StatCard
      key="totalMembers"
      label="Total members"
      value={stats.totalMembers}
      icon={Users}
      tone="primary"
      hint={`${stats.activeMembers} active`}
      highlight
    />,
  ];
  if (canSeeLeads) {
    overviewCards.push(
      <StatCard
        key="totalLeads"
        label="Total leads"
        value={stats.totalLeads}
        icon={UserPlus}
        tone="primary"
        hint={`${stats.convertedLeads} converted`}
      />,
    );
  }
  if (canSeeRevenue) {
    overviewCards.push(
      <StatCard
        key="monthRevenue"
        label="This month revenue"
        value={formatPaiseShort(stats.monthRevenuePaise)}
        icon={TrendingUp}
        tone="accent"
        highlight
      />,
    );
  }
  overviewCards.push(
    <StatCard
      key="activeMemberships"
      label="Active memberships"
      value={stats.activeMembers + stats.expiringSoon}
      icon={Users}
      tone="accent"
      hint={`${stats.expiringSoon} expiring`}
    />,
  );

  // Activity row — filtered
  const activityCards: React.ReactNode[] = [
    <AlertsPanel key="alerts" alerts={alerts} role={role} />,
  ];
  if (canSeePayments) {
    activityCards.push(<RecentPayments key="payments" payments={payments} />);
  }
  if (canSeeLeads) {
    activityCards.push(<RecentLeads key="leads" leads={leads} />);
  }

  return (
    <div className="space-y-8">
      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[hsl(84,81%,56%)] opacity-15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-[hsl(158,64%,42%)] opacity-15 blur-3xl"
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live · {format(today, "EEE, d MMM")}
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {greeting()},{" "}
              <span className="text-gradient-primary">{firstName}</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening at Vayu Fitness today.
            </p>
          </div>

          {canSeeMembers && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span>{stats.totalMembers} members tracked</span>
            </div>
          )}
        </div>
      </section>

      {/* ── QUICK ACTIONS — only if the role can do at least one of them ─ */}
      {hasQuickActions && (
        <section>
          <SectionLabel title="Quick actions" />
          <QuickActions role={role} />
        </section>
      )}

      {/* ── TODAY ──────────────────────────────────────────────────────── */}
      {todayCards.length > 0 && (
        <section>
          <SectionLabel title="Today" hint={format(today, "EEEE · h:mm a")} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{todayCards}</div>
        </section>
      )}

      {/* ── OVERVIEW (totals) ─────────────────────────────────────────── */}
      {overviewCards.length > 0 && (
        <section>
          <SectionLabel title="Overview" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{overviewCards}</div>
        </section>
      )}

      {/* ── MEMBERSHIP STATUS — operational, all roles see this ─────────── */}
      <section>
        <SectionLabel title="Membership status" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Expiring soon"
            value={stats.expiringSoon}
            icon={AlertTriangle}
            tone="warn"
            hint="Within 7 days"
          />
          <StatCard
            label="Frozen"
            value={stats.frozenMembers}
            icon={Snowflake}
            tone="muted"
          />
          {canSeeRevenue && (
            <StatCard
              label="Pending payment"
              value={stats.pendingPayment}
              icon={IndianRupee}
              tone="warn"
            />
          )}
          {canSeeRevenue && (
            <StatCard
              label="Installments due (14d)"
              value={stats.upcomingInstallments}
              icon={ClipboardList}
              tone="warn"
            />
          )}
          {canSeeFreezes && stats.pendingFreezes > 0 && (
            <StatCard
              label="Freeze approvals"
              value={stats.pendingFreezes}
              icon={Snowflake}
              tone="warn"
              hint="Awaiting your decision"
            />
          )}
        </div>
      </section>

      {/* ── CHARTS — Revenue gated; Member status visible to all ───────── */}
      <section>
        <SectionLabel title="Trends" />
        <div className={`grid grid-cols-1 gap-4 ${canSeeRevenue ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}>
          {canSeeRevenue && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue (last 6 months)</CardTitle>
                <CardDescription>Includes paid + partial payments, GST inclusive</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueChart data={revenue} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Member status</CardTitle>
              <CardDescription>Breakdown by current status</CardDescription>
            </CardHeader>
            <CardContent>
              <MemberStatusChart data={statusBreakdown} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── ACTIVITY — alerts, recent payments/leads (filtered) ────────── */}
      {activityCards.length > 0 && (
        <section>
          <SectionLabel title="Activity" />
          <div
            className={`grid grid-cols-1 gap-4 ${
              activityCards.length >= 3
                ? "lg:grid-cols-3"
                : activityCards.length === 2
                  ? "lg:grid-cols-2"
                  : "lg:grid-cols-1"
            }`}
          >
            {activityCards}
          </div>
        </section>
      )}

      {/* ── COMING UP — expiries always; installment dues only with revenue ─ */}
      <section>
        <SectionLabel title="Coming up" />
        <div className={`grid grid-cols-1 gap-4 ${canSeeRevenue ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
          <UpcomingExpiries memberships={expiries} />
          {canSeeRevenue && <InstallmentDues installments={installments} />}
        </div>
      </section>
    </div>
  );
}
