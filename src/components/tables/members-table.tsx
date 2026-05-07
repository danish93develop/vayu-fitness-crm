"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, Dumbbell, Trash2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { SelectableDataTable } from "./selectable-data-table";
import { PersonCell } from "./person-cell";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { downloadCsv } from "@/lib/csv";
import { formatDate, relativeTime } from "@/lib/date";
import {
  bulkDeleteMembersAction,
  bulkExportMembersAction,
} from "@/server/actions/members";
import type { MemberStatus } from "@prisma/client";

type MemberRow = {
  id: string;
  fullName: string;
  memberCode: string;
  phone: string;
  status: MemberStatus;
  joiningDate: Date;
  profilePhotoUrl: string | null;
  assignedTrainer: { name: string } | null;
};

type Props = {
  rows: MemberRow[];
  /** When true, hides the bulk delete control. Useful for non-admin viewers. */
  canDelete: boolean;
};

export function MembersTable({ rows, canDelete }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<{
    ids: string[];
    clear: () => void;
  } | null>(null);

  function handleExport(ids: string[]) {
    startTransition(async () => {
      const result = await bulkExportMembersAction(ids);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`members-${stamp}.csv`, result.data.csv);
      toast.success(`Exported ${result.data.count} member${result.data.count === 1 ? "" : "s"}.`);
    });
  }

  function handleDelete() {
    if (!confirmDelete) return;
    const { ids, clear } = confirmDelete;
    setConfirmDelete(null);
    startTransition(async () => {
      const result = await bulkDeleteMembersAction(ids);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { deleted, skipped } = result.data;
      if (deleted > 0) {
        toast.success(
          `Deleted ${deleted} member${deleted === 1 ? "" : "s"}.${
            skipped > 0 ? ` ${skipped} skipped.` : ""
          }`,
        );
      } else {
        toast.error("No members were deleted.");
      }
      clear();
      router.refresh();
    });
  }

  return (
    <>
      <SelectableDataTable
        rows={rows}
        rowKey={(m) => m.id}
        emptyMessage="No members yet. Click 'Add member' to create one."
        bulkActions={({ selectedIds, clear }) => (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => handleExport(selectedIds)}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export CSV
            </Button>
            {canDelete && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={pending}
                onClick={() => setConfirmDelete({ ids: selectedIds, clear })}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </>
        )}
        columns={[
          {
            key: "person",
            header: "Member",
            cell: (m) => (
              <PersonCell
                name={m.fullName}
                seed={m.id}
                photoUrl={m.profilePhotoUrl}
                href={`/members/${m.id}`}
                secondary={<span className="font-mono">{m.memberCode}</span>}
              />
            ),
          },
          {
            key: "phone",
            header: "Contact",
            cell: (m) => (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span className="tabular-nums">{m.phone}</span>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (m) => <StatusBadge status={m.status} />,
          },
          {
            key: "trainer",
            header: "Trainer",
            cell: (m) =>
              m.assignedTrainer ? (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Dumbbell className="h-3.5 w-3.5" />
                  {m.assignedTrainer.name}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              ),
          },
          {
            key: "joined",
            header: "Joined",
            cell: (m) => (
              <div className="text-sm">
                <div>{formatDate(m.joiningDate)}</div>
                <div className="text-xs text-muted-foreground">
                  {relativeTime(m.joiningDate)}
                </div>
              </div>
            ),
          },
        ]}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {confirmDelete?.ids.length ?? 0} member
              {(confirmDelete?.ids.length ?? 0) === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They&apos;ll be soft-deleted and hidden from the list. Their attendance and
              payment history stay intact, and an admin can restore them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
