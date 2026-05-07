import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { reportRevenue } from "@/server/services/reports";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/tables/data-table";
import { DatePickerLink } from "@/components/layout/date-picker-link";
import { FilterSelect } from "@/components/dashboard/filter-select";
import { CsvDownloadButton } from "@/components/forms/csv-download-button";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatPaiseShort } from "@/lib/money";
import { formatDate } from "@/lib/date";

export const metadata = { title: "Revenue report" };
export const dynamic = "force-dynamic";

export default async function RevenueReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    plan?: string;
    user?: string;
    mode?: string;
  }>;
}) {
  const session = await requirePermission("reports:read");
  const sp = await searchParams;
  const from = sp.from ? new Date(sp.from) : undefined;
  const to = sp.to ? new Date(sp.to) : undefined;

  const [data, plans, staff] = await Promise.all([
    reportRevenue(session.user.gymId, {
      fromDate: from,
      toDate: to,
      planId: sp.plan && sp.plan !== "ALL" ? sp.plan : undefined,
      receivedById: sp.user && sp.user !== "ALL" ? sp.user : undefined,
      mode: sp.mode && sp.mode !== "ALL" ? sp.mode : undefined,
    }),
    prisma.membershipPlan.findMany({
      where: { gymId: session.user.gymId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.user.findMany({
      where: { gymId: session.user.gymId, deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const csvHeaders = ["Code", "Date", "Member", "Plan", "Mode", "Status", "Taxable", "GST", "Total"];
  const csvRows = data.payments.map((p) => [
    p.paymentCode,
    formatDate(p.paymentDate),
    p.member.fullName,
    p.membership?.plan.name ?? "",
    p.mode,
    p.status,
    p.taxablePaise / 100,
    p.gstPaise / 100,
    p.totalPaise / 100,
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Revenue report"
        description={`${data.summary.count} payment${data.summary.count === 1 ? "" : "s"} · totaling ${formatPaiseShort(data.summary.totalPaise)}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/reports"><ArrowLeft className="h-4 w-4" /> All reports</Link>
            </Button>
            <CsvDownloadButton
              filename={`vayu-revenue-${new Date().toISOString().slice(0, 10)}`}
              headers={csvHeaders}
              rows={csvRows}
            />
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-4">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">From</div>
          <DatePickerLink value={sp.from ?? ""} paramName="from" />
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">To</div>
          <DatePickerLink value={sp.to ?? ""} paramName="to" />
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Plan</div>
          <FilterSelect
            paramName="plan"
            value={sp.plan ?? "ALL"}
            options={[
              { value: "ALL", label: "All plans" },
              ...plans.map((p) => ({ value: p.id, label: p.name })),
            ]}
            className="w-44"
          />
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Received by</div>
          <FilterSelect
            paramName="user"
            value={sp.user ?? "ALL"}
            options={[
              { value: "ALL", label: "All staff" },
              ...staff.map((s) => ({ value: s.id, label: s.name })),
            ]}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Mode</div>
          <FilterSelect
            paramName="mode"
            value={sp.mode ?? "ALL"}
            options={[
              { value: "ALL", label: "All modes" },
              { value: "CASH", label: "Cash" },
              { value: "UPI", label: "UPI" },
              { value: "CARD", label: "Card" },
              { value: "BANK_TRANSFER", label: "Bank Transfer" },
              { value: "OTHER", label: "Other" },
            ]}
            className="w-36"
          />
        </div>
        {(sp.from || sp.to || sp.plan || sp.user || sp.mode) && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/reports/revenue">Clear all</Link>
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Total" value={formatPaiseShort(data.summary.totalPaise)} hint={`${data.summary.count} payments`} />
        <SummaryCard label="Taxable" value={formatPaiseShort(data.summary.taxablePaise)} />
        <SummaryCard label="GST collected" value={formatPaiseShort(data.summary.gstPaise)} />
        <SummaryCard label="Discounts given" value={formatPaiseShort(data.summary.discountPaise)} />
      </div>

      {/* Trend + breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>6-month trend</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={data.trend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By payment mode</CardTitle>
          </CardHeader>
          <CardContent>
            {data.modeBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.modeBreakdown.map((m) => (
                  <li key={m.mode} className="flex items-center justify-between">
                    <span>{m.mode.replace("_", " ")}</span>
                    <span className="text-right">
                      <span className="font-semibold tabular-nums">{formatPaiseShort(m.totalPaise)}</span>
                      <span className="ml-2 text-xs text-muted-foreground">({m.count})</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <DataTable
        rows={data.payments}
        rowKey={(p) => p.id}
        emptyMessage="No payments in this date range."
        columns={[
          { key: "code", header: "Code", cell: (p) => <span className="font-mono text-xs">{p.paymentCode}</span> },
          { key: "date", header: "Date", cell: (p) => <span className="text-sm">{formatDate(p.paymentDate)}</span> },
          { key: "member", header: "Member", cell: (p) => <span className="text-sm">{p.member.fullName}</span> },
          { key: "plan", header: "Plan", cell: (p) => <span className="text-sm text-muted-foreground">{p.membership?.plan.name ?? "—"}</span> },
          { key: "mode", header: "Mode", cell: (p) => <span className="text-xs">{p.mode}</span> },
          { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
          { key: "total", header: "Total", cell: (p) => <span className="font-semibold tabular-nums">{formatPaiseShort(p.totalPaise)}</span> },
        ]}
      />
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
