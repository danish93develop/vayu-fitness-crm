import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { reportLeads } from "@/server/services/reports";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/tables/data-table";
import { DatePickerLink } from "@/components/layout/date-picker-link";
import { CsvDownloadButton } from "@/components/forms/csv-download-button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatDate } from "@/lib/date";

export const metadata = { title: "Lead conversion report" };
export const dynamic = "force-dynamic";

const STATUS_ORDER = ["NEW", "CONTACTED", "TRIAL_BOOKED", "TRIAL_COMPLETED", "CONVERTED", "LOST"];

export default async function LeadsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await requirePermission("reports:read");
  const sp = await searchParams;
  const from = sp.from ? new Date(sp.from) : undefined;
  const to = sp.to ? new Date(sp.to) : undefined;

  const data = await reportLeads(session.user.gymId, { fromDate: from, toDate: to });

  const csvHeaders = ["Date", "Name", "Phone", "Email", "Source", "Interested in", "Status", "Assigned to"];
  const csvRows = data.leads.map((l) => [
    formatDate(l.createdAt),
    l.name,
    l.phone,
    l.email ?? "",
    l.source,
    l.interestedPlan?.name ?? "",
    l.status,
    l.assignedTo?.name ?? "",
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Lead conversion"
        description={`${data.total} lead${data.total === 1 ? "" : "s"} · ${data.converted} converted · ${data.conversionRate}% conversion rate`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/reports"><ArrowLeft className="h-4 w-4" /> All reports</Link>
            </Button>
            <CsvDownloadButton
              filename={`vayu-leads-${new Date().toISOString().slice(0, 10)}`}
              headers={csvHeaders}
              rows={csvRows}
            />
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-4">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">From</div>
          <DatePickerLink value={sp.from ?? ""} paramName="from" />
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">To</div>
          <DatePickerLink value={sp.to ?? ""} paramName="to" />
        </div>
        {(sp.from || sp.to) && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/reports/leads">Clear</Link>
          </Button>
        )}
      </div>

      {/* Funnel + sources */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads in this range.</p>
            ) : (
              <ul className="space-y-2">
                {STATUS_ORDER.map((status) => {
                  const row = data.byStatus.find((b) => b.status === status);
                  const count = row?.count ?? 0;
                  const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
                  return (
                    <li key={status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{status.replace("_", " ")}</span>
                        <span className="text-muted-foreground">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By source</CardTitle>
          </CardHeader>
          <CardContent>
            {data.bySource.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.bySource
                  .sort((a, b) => b.count - a.count)
                  .map((s) => (
                    <li key={s.source} className="flex items-center justify-between">
                      <span>{s.source.replace("_", " ")}</span>
                      <span className="font-semibold">{s.count}</span>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <DataTable
        rows={data.leads}
        rowKey={(l) => l.id}
        emptyMessage="No leads in this date range."
        columns={[
          { key: "date", header: "Created", cell: (l) => <span className="text-xs">{formatDate(l.createdAt)}</span> },
          {
            key: "name",
            header: "Name",
            cell: (l) => (
              <Link href={`/leads/${l.id}` as never} className="font-medium hover:underline">
                {l.name}
              </Link>
            ),
          },
          { key: "phone", header: "Phone", cell: (l) => <span className="text-xs">{l.phone}</span> },
          { key: "source", header: "Source", cell: (l) => <span className="text-xs">{l.source.replace("_", " ")}</span> },
          { key: "interested", header: "Interested in", cell: (l) => <span className="text-xs text-muted-foreground">{l.interestedPlan?.name ?? "—"}</span> },
          { key: "status", header: "Status", cell: (l) => <StatusBadge status={l.status} /> },
          { key: "assigned", header: "Assigned to", cell: (l) => <span className="text-xs">{l.assignedTo?.name ?? "—"}</span> },
        ]}
      />
    </div>
  );
}
