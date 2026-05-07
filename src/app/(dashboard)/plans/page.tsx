import Link from "next/link";
import { Edit, Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { listPlans } from "@/server/services/plans";
import { deletePlanAction } from "@/server/actions/plans";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/tables/data-table";
import { DeleteConfirm } from "@/components/forms/delete-confirm";
import { formatPaiseShort } from "@/lib/money";
import { formatDuration } from "@/lib/membership-utils";

export const metadata = { title: "Plans" };
export const dynamic = "force-dynamic";

const TYPE_LABELS = {
  MAIN_MEMBERSHIP: "Main",
  ADD_ON: "Add-on",
  CLASS_PACKAGE: "Class",
  PERSONAL_TRAINING: "PT",
} as const;

export default async function PlansPage() {
  const session = await requirePermission("plans:read");
  const plans = await listPlans(session.user.gymId);

  const canCreate = can(session.user.role, "plans:create");
  const canEdit = can(session.user.role, "plans:update");
  const canDelete = can(session.user.role, "plans:delete");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Membership plans"
        description="Define what gym members can buy. Soft-deleted plans are hidden from new memberships but retain history."
        actions={
          canCreate && (
            <Button asChild>
              <Link href="/plans/new">
                <Plus className="h-4 w-4" /> Add plan
              </Link>
            </Button>
          )
        }
      />

      <DataTable
        rows={plans}
        rowKey={(p) => p.id}
        emptyMessage="No plans yet."
        columns={[
          { key: "name", header: "Name", cell: (p) => <span className="font-medium">{p.name}</span> },
          {
            key: "type",
            header: "Type",
            cell: (p) => <Badge variant="outline">{TYPE_LABELS[p.type]}</Badge>,
          },
          {
            key: "duration",
            header: "Duration",
            cell: (p) => formatDuration(p.durationValue, p.durationUnit),
          },
          {
            key: "price",
            header: "Price",
            cell: (p) => <span className="font-semibold tabular-nums">{formatPaiseShort(p.basePricePaise)}</span>,
          },
          {
            key: "instal",
            header: "Installments",
            cell: (p) =>
              p.allowsInstallments ? (
                <span className="text-sm">Up to {p.maxInstallments}</span>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              ),
          },
          {
            key: "members",
            header: "Members",
            cell: (p) => <span className="text-sm">{p._count.memberships}</span>,
          },
          {
            key: "status",
            header: "Status",
            cell: (p) =>
              p.isActive ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="muted">Inactive</Badge>
              ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            cell: (p) => (
              <div className="flex items-center justify-end gap-2">
                {canEdit && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/plans/${p.id}/edit` as never}>
                      <Edit className="h-3 w-3" /> Edit
                    </Link>
                  </Button>
                )}
                {canDelete && (
                  <DeleteConfirm
                    title={`Delete ${p.name}?`}
                    description="Plans with active memberships can't be deleted. Deactivate them instead so they stop showing in 'Assign membership'."
                    onConfirm={async () => {
                      "use server";
                      return deletePlanAction(p.id);
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
