import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { reportAttendance } from "@/server/services/reports";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/data-table";
import { DatePickerLink } from "@/components/layout/date-picker-link";
import { CsvDownloadButton } from "@/components/forms/csv-download-button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatDate, addDays, startOfDay } from "@/lib/date";

export const metadata = { title: "Attendance report" };
export const dynamic = "force-dynamic";

export default async function AttendanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await requirePermission("reports:read");
  const sp = await searchParams;

  const today = startOfDay(new Date());
  const fromDate = sp.from ? new Date(sp.from) : addDays(today, -29);
  const toDate = sp.to ? new Date(sp.to) : today;

  const data = await reportAttendance(session.user.gymId, { fromDate, toDate });

  const csvHeaders = ["Member code", "Name", "Phone", "Status", "Visits"];
  const csvRows = data.perMember.map((m) => [m.memberCode, m.fullName, m.phone, m.status, m.count]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Attendance report"
        description={`${data.totalCount} total visit${data.totalCount === 1 ? "" : "s"} between ${formatDate(fromDate)} and ${formatDate(toDate)}.`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/reports"><ArrowLeft className="h-4 w-4" /> All reports</Link>
            </Button>
            <CsvDownloadButton
              filename={`vayu-attendance-${new Date().toISOString().slice(0, 10)}`}
              headers={csvHeaders}
              rows={csvRows}
            />
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-4">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">From</div>
          <DatePickerLink value={sp.from ?? fromDate.toISOString().slice(0, 10)} paramName="from" />
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">To</div>
          <DatePickerLink value={sp.to ?? toDate.toISOString().slice(0, 10)} paramName="to" />
        </div>
      </div>

      <DataTable
        rows={data.perMember}
        rowKey={(m) => m.memberId}
        emptyMessage="No attendance recorded in this range."
        columns={[
          { key: "code", header: "Code", cell: (m) => <span className="font-mono text-xs">{m.memberCode}</span> },
          {
            key: "name",
            header: "Name",
            cell: (m) => (
              <Link href={`/members/${m.memberId}` as never} className="font-medium hover:underline">
                {m.fullName}
              </Link>
            ),
          },
          { key: "phone", header: "Phone", cell: (m) => <span className="text-xs text-muted-foreground">{m.phone}</span> },
          { key: "status", header: "Status", cell: (m) => <StatusBadge status={m.status} /> },
          {
            key: "count",
            header: "Visits",
            cell: (m) => <span className="font-semibold tabular-nums">{m.count}</span>,
          },
        ]}
      />
    </div>
  );
}
