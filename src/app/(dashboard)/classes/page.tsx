import Link from "next/link";
import { Edit, Plus, Users, ArrowRight } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { listClasses } from "@/server/services/classes";
import { deleteClassAction } from "@/server/actions/classes";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { DataTable } from "@/components/tables/data-table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { DeleteConfirm } from "@/components/forms/delete-confirm";
import { formatDate, formatTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { ClassStatus } from "@prisma/client";

export const metadata = { title: "Classes" };
export const dynamic = "force-dynamic";

const statusOptions = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "ONGOING", label: "Ongoing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requirePermission("classes:read");
  const sp = await searchParams;

  const classes = await listClasses(session.user.gymId, {
    search: sp.q ?? "",
    status: (sp.status as ClassStatus | undefined) ?? "ALL",
  });

  const canCreate = can(session.user.role, "classes:create");
  const canEdit = can(session.user.role, "classes:update");
  const canDelete = can(session.user.role, "classes:delete");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Classes"
        description="Schedule yoga, zumba, strength training, and more. Open any class to book members and track capacity."
        actions={
          canCreate && (
            <Button asChild>
              <Link href="/classes/new">
                <Plus className="h-4 w-4" /> Schedule class
              </Link>
            </Button>
          )
        }
      />

      <TableToolbar
        searchPlaceholder="Search by class name or trainer…"
        filterLabel="Status"
        filterOptions={statusOptions}
      />

      <DataTable
        rows={classes}
        rowKey={(c) => c.id}
        emptyMessage="No classes scheduled."
        columns={[
          {
            key: "name",
            header: "Class",
            cell: (c) => (
              <Link
                href={`/classes/${c.id}` as never}
                className="font-medium hover:underline"
              >
                {c.name}
              </Link>
            ),
          },
          {
            key: "trainer",
            header: "Trainer",
            cell: (c) => (
              <span className="text-sm text-muted-foreground">{c.trainer?.name ?? "—"}</span>
            ),
          },
          { key: "date", header: "Date", cell: (c) => <span className="text-sm">{formatDate(c.date)}</span> },
          {
            key: "time",
            header: "Time",
            cell: (c) => (
              <span className="text-sm tabular-nums">
                {formatTime(c.startTime)} – {formatTime(c.endTime)}
              </span>
            ),
          },
          {
            key: "bookings",
            header: "Bookings",
            cell: (c) => {
              const booked = c._count.bookings;
              const pct = Math.min(100, Math.round((booked / c.capacity) * 100));
              return (
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm tabular-nums">
                    {booked} / {c.capacity}
                  </span>
                  <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted lg:block">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        booked >= c.capacity
                          ? "bg-rose-500"
                          : pct > 75
                            ? "bg-amber-500"
                            : "bg-emerald-500",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            },
          },
          { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
          {
            key: "actions",
            header: "",
            className: "text-right",
            cell: (c) => (
              <div className="flex items-center justify-end gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/classes/${c.id}` as never}>
                    Open <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
                {canEdit && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/classes/${c.id}/edit` as never}>
                      <Edit className="h-3 w-3" /> Edit
                    </Link>
                  </Button>
                )}
                {canDelete && (
                  <DeleteConfirm
                    title={`Delete "${c.name}"?`}
                    description="This soft-deletes the class. Past schedule history is preserved for audit."
                    onConfirm={async () => {
                      "use server";
                      return deleteClassAction(c.id);
                    }}
                  />
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
