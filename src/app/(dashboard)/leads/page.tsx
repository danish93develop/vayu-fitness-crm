import { Phone, Package } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { listLeads } from "@/server/services/leads";
import { PageHeader } from "@/components/layout/page-header";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { DataTable } from "@/components/tables/data-table";
import { TablePagination } from "@/components/tables/pagination";
import { PersonCell } from "@/components/tables/person-cell";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatDate, relativeTime } from "@/lib/date";
import type { LeadStatus } from "@prisma/client";

export const metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

const statusOptions = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "TRIAL_BOOKED", label: "Trial booked" },
  { value: "TRIAL_COMPLETED", label: "Trial completed" },
  { value: "CONVERTED", label: "Converted" },
  { value: "LOST", label: "Lost" },
];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await requirePermission("leads:read");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { items, total, pageCount, pageSize } = await listLeads(session.user.gymId, {
    search: sp.q ?? "",
    status: (sp.status as LeadStatus | undefined) ?? "ALL",
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Leads" description="Track enquiries through the conversion funnel." />

      <TableToolbar
        searchPlaceholder="Search by name, phone, email…"
        filterLabel="Status"
        filterOptions={statusOptions}
        newHref="/leads/new"
        newLabel="Add lead"
      />

      <DataTable
        rows={items}
        rowKey={(l) => l.id}
        emptyMessage="No leads yet."
        columns={[
          {
            key: "person",
            header: "Lead",
            cell: (l) => (
              <PersonCell
                name={l.name}
                seed={l.id}
                href={`/leads/${l.id}`}
                secondary={
                  <span className="inline-flex items-center gap-1">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                      {titleCase(l.source)}
                    </span>
                  </span>
                }
              />
            ),
          },
          {
            key: "phone",
            header: "Contact",
            cell: (l) => (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span className="tabular-nums">{l.phone}</span>
              </div>
            ),
          },
          {
            key: "interested",
            header: "Interested in",
            cell: (l) =>
              l.interestedPlan?.name ? (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                  {l.interestedPlan.name}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              ),
          },
          {
            key: "status",
            header: "Status",
            cell: (l) => <StatusBadge status={l.status} />,
          },
          {
            key: "follow",
            header: "Follow-up",
            cell: (l) =>
              l.followUpDate ? (
                <div className="text-sm">
                  <div>{formatDate(l.followUpDate)}</div>
                  <div className="text-xs text-muted-foreground">
                    {relativeTime(l.followUpDate)}
                  </div>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              ),
          },
          {
            key: "created",
            header: "Created",
            cell: (l) => (
              <span className="text-xs text-muted-foreground">{relativeTime(l.createdAt)}</span>
            ),
          },
        ]}
      />

      <TablePagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} />
    </div>
  );
}

function titleCase(s: string) {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
