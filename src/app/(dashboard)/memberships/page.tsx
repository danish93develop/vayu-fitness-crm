import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { listMemberships } from "@/server/services/memberships";
import { PageHeader } from "@/components/layout/page-header";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { DataTable } from "@/components/tables/data-table";
import { TablePagination } from "@/components/tables/pagination";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatDate, daysFromNow } from "@/lib/date";
import { formatPaiseShort } from "@/lib/money";
import type { MembershipStatus } from "@prisma/client";

export const metadata = { title: "Memberships" };
export const dynamic = "force-dynamic";

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRING_SOON", label: "Expiring soon" },
  { value: "EXPIRED", label: "Expired" },
  { value: "FROZEN", label: "Frozen" },
  { value: "PENDING_PAYMENT", label: "Pending payment" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default async function MembershipsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await requirePermission("memberships:read");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { items, total, pageCount, pageSize } = await listMemberships(session.user.gymId, {
    search: sp.q ?? "",
    status: (sp.status as MembershipStatus | undefined) ?? "ALL",
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Memberships"
        description="All assigned plans across all members."
      />

      <TableToolbar
        searchPlaceholder="Search by member, code…"
        filterLabel="Status"
        filterOptions={statusOptions}
        newHref="/memberships/new"
        newLabel="Assign membership"
      />

      <DataTable
        rows={items}
        rowKey={(m) => m.id}
        emptyMessage="No memberships yet."
        columns={[
          {
            key: "code",
            header: "Code",
            cell: (m) => (
              <Link
                href={`/memberships/${m.id}` as never}
                className="font-mono text-xs hover:underline"
              >
                {m.membershipCode}
              </Link>
            ),
          },
          {
            key: "member",
            header: "Member",
            cell: (m) => (
              <Link
                href={`/members/${m.member.id}` as never}
                className="font-medium hover:underline"
              >
                {m.member.fullName}
              </Link>
            ),
          },
          { key: "plan", header: "Plan", cell: (m) => <span className="text-sm">{m.plan.name}</span> },
          {
            key: "dates",
            header: "Period",
            cell: (m) => (
              <div className="text-xs">
                <div>{formatDate(m.startDate)}</div>
                <div className="text-muted-foreground">
                  to {formatDate(m.endDate)}{" "}
                  {m.status === "ACTIVE" || m.status === "EXPIRING_SOON" ? (
                    <span>· {daysFromNow(m.endDate)}d left</span>
                  ) : null}
                </div>
              </div>
            ),
          },
          {
            key: "price",
            header: "Price",
            cell: (m) => (
              <span className="font-semibold tabular-nums">
                {formatPaiseShort(m.finalPricePaise)}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (m) => <StatusBadge status={m.status} />,
          },
        ]}
      />

      <TablePagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} />
    </div>
  );
}
