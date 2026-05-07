import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { reportMembers } from "@/server/services/reports";
import { syncMembershipStatuses } from "@/server/services/membership-status";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { DataTable } from "@/components/tables/data-table";
import { CsvDownloadButton } from "@/components/forms/csv-download-button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatDate } from "@/lib/date";
import type { MemberStatus } from "@prisma/client";

export const metadata = { title: "Members report" };
export const dynamic = "force-dynamic";

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRING_SOON", label: "Expiring soon" },
  { value: "EXPIRED", label: "Expired" },
  { value: "FROZEN", label: "Frozen" },
  { value: "PENDING_PAYMENT", label: "Pending payment" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default async function MembersReportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requirePermission("reports:read");
  await syncMembershipStatuses();
  const sp = await searchParams;
  const status = (sp.status as MemberStatus | undefined) ?? "ALL";

  const members = await reportMembers(session.user.gymId, { status });

  // Build CSV rows
  const csvHeaders = [
    "Member code",
    "Full name",
    "Phone",
    "Email",
    "Status",
    "Plan",
    "Plan end",
    "Trainer",
    "Joined",
  ];
  const csvRows = members.map((m) => [
    m.memberCode,
    m.fullName,
    m.phone,
    m.email ?? "",
    m.status,
    m.memberships[0]?.plan.name ?? "",
    m.memberships[0]?.endDate ? formatDate(m.memberships[0].endDate) : "",
    m.assignedTrainer?.name ?? "",
    formatDate(m.joiningDate),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Members report"
        description={`${members.length} member${members.length === 1 ? "" : "s"}.`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/reports">
                <ArrowLeft className="h-4 w-4" /> All reports
              </Link>
            </Button>
            <CsvDownloadButton
              filename={`vayu-members-${status.toLowerCase()}-${new Date().toISOString().slice(0, 10)}`}
              headers={csvHeaders}
              rows={csvRows}
            />
          </>
        }
      />

      <TableToolbar
        searchPlaceholder=""
        filterLabel="Status"
        filterOptions={statusOptions}
      />

      <DataTable
        rows={members}
        rowKey={(m) => m.id}
        emptyMessage="No members match this filter."
        columns={[
          { key: "code", header: "Code", cell: (m) => <span className="font-mono text-xs">{m.memberCode}</span> },
          {
            key: "name",
            header: "Name",
            cell: (m) => (
              <Link href={`/members/${m.id}` as never} className="font-medium hover:underline">
                {m.fullName}
              </Link>
            ),
          },
          { key: "phone", header: "Phone", cell: (m) => <span className="text-xs text-muted-foreground">{m.phone}</span> },
          {
            key: "plan",
            header: "Plan",
            cell: (m) => (
              <span className="text-sm text-muted-foreground">
                {m.memberships[0]?.plan.name ?? "—"}
              </span>
            ),
          },
          {
            key: "end",
            header: "Plan end",
            cell: (m) =>
              m.memberships[0] ? (
                <span className="text-xs">{formatDate(m.memberships[0].endDate)}</span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              ),
          },
          {
            key: "trainer",
            header: "Trainer",
            cell: (m) => <span className="text-sm text-muted-foreground">{m.assignedTrainer?.name ?? "—"}</span>,
          },
          { key: "status", header: "Status", cell: (m) => <StatusBadge status={m.status} /> },
        ]}
      />
    </div>
  );
}
