import Link from "next/link";
import { Edit, Plus, Users } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { listTrainers } from "@/server/services/trainers";
import { deleteTrainerAction } from "@/server/actions/trainers";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/tables/data-table";
import { PersonCell } from "@/components/tables/person-cell";
import { DeleteConfirm } from "@/components/forms/delete-confirm";

export const metadata = { title: "Trainers" };
export const dynamic = "force-dynamic";

export default async function TrainersPage() {
  const session = await requirePermission("trainers:read");
  const trainers = await listTrainers(session.user.gymId);

  const canEdit = can(session.user.role, "trainers:update");
  const canDelete = can(session.user.role, "trainers:delete");
  const canCreate = can(session.user.role, "trainers:create");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trainers"
        description="Manage trainers and their member assignments."
        actions={
          canCreate && (
            <Button asChild>
              <Link href="/trainers/new">
                <Plus className="h-4 w-4" />
                Add trainer
              </Link>
            </Button>
          )
        }
      />

      <DataTable
        rows={trainers}
        rowKey={(t) => t.id}
        emptyMessage="No trainers yet."
        columns={[
          {
            key: "person",
            header: "Trainer",
            cell: (t) => (
              <PersonCell
                name={t.name}
                seed={t.id}
                href={`/trainers/${t.id}`}
                secondary={t.specialization ?? "No specialization"}
              />
            ),
          },
          {
            key: "phone",
            header: "Contact",
            cell: (t) => (
              <span className="text-sm text-muted-foreground">{t.phone ?? t.email ?? "—"}</span>
            ),
          },
          {
            key: "members",
            header: "Members",
            cell: (t) => (
              <span className="flex items-center gap-1 text-sm">
                <Users className="h-3 w-3 text-muted-foreground" />
                {t._count.assignedMembers}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (t) =>
              t.isActive ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="muted">Inactive</Badge>
              ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            cell: (t) => (
              <div className="flex items-center justify-end gap-2">
                {canEdit && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/trainers/${t.id}/edit` as never}>
                      <Edit className="h-3 w-3" />
                      Edit
                    </Link>
                  </Button>
                )}
                {canDelete && (
                  <DeleteConfirm
                    title={`Delete ${t.name}?`}
                    description="This soft-deletes the trainer. Trainers with assigned members can't be deleted."
                    onConfirm={async () => {
                      "use server";
                      return deleteTrainerAction(t.id);
                    }}
                    triggerLabel="Delete"
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
