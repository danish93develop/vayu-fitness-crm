import Link from "next/link";
import { Edit, Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { listUsers } from "@/server/services/users";
import { deleteUserAction } from "@/server/actions/users";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { DataTable } from "@/components/tables/data-table";
import { TablePagination } from "@/components/tables/pagination";
import { PersonCell } from "@/components/tables/person-cell";
import { DeleteConfirm } from "@/components/forms/delete-confirm";
import { ResetPasswordButton } from "@/components/forms/reset-password-button";
import { UnlockUserButton } from "@/components/forms/unlock-user-button";
import { relativeTime } from "@/lib/date";
import type { UserRoleType } from "@prisma/client";

export const metadata = { title: "Users" };
export const dynamic = "force-dynamic";

const roleOptions = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "TRAINER", label: "Trainer" },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  RECEPTIONIST: "Receptionist",
  ACCOUNTANT: "Accountant",
  TRAINER: "Trainer",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await requirePermission("users:read");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { items, total, pageCount, pageSize } = await listUsers(session.user.gymId, {
    search: sp.q ?? "",
    role: (sp.status as UserRoleType | undefined) ?? "ALL", // reuse status param for role filter
    page,
    pageSize: 50,
  });

  const canCreate = can(session.user.role, "users:create");
  const canEdit = can(session.user.role, "users:update");
  const canDelete = can(session.user.role, "users:delete");

  const now = new Date();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users &amp; staff"
        description="Manage who can sign into the system. Roles determine which modules each person can use."
        actions={
          canCreate && (
            <Button asChild>
              <Link href="/users/new">
                <Plus className="h-4 w-4" /> Add staff
              </Link>
            </Button>
          )
        }
      />

      <TableToolbar
        searchPlaceholder="Search by name, email, or phone…"
        filterLabel="Role"
        filterOptions={roleOptions}
      />

      <DataTable
        rows={items}
        rowKey={(u) => u.id}
        emptyMessage="No staff accounts yet."
        columns={[
          {
            key: "person",
            header: "Staff",
            cell: (u) => (
              <div className="flex items-center gap-2">
                <PersonCell name={u.name} seed={u.id} secondary={u.email} />
                {u.id === session.user.id && <Badge variant="outline">You</Badge>}
              </div>
            ),
          },
          {
            key: "role",
            header: "Role",
            cell: (u) => (
              <Badge
                variant={u.role === "SUPER_ADMIN" || u.role === "ADMIN" ? "default" : "outline"}
              >
                {ROLE_LABELS[u.role] ?? u.role}
              </Badge>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (u) => {
              const locked = u.lockedUntil && u.lockedUntil > now;
              if (locked) {
                return (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/15 dark:text-rose-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    Locked
                  </span>
                );
              }
              if (!u.isActive) {
                return (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/15 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/15 dark:text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    Inactive
                  </span>
                );
              }
              return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              );
            },
          },
          {
            key: "lastLogin",
            header: "Last login",
            cell: (u) => (
              <div className="text-xs">
                <div>{u.lastLoginAt ? relativeTime(u.lastLoginAt) : <span className="text-muted-foreground">Never</span>}</div>
                {u.lastLoginIp && (
                  <div className="font-mono text-muted-foreground">{u.lastLoginIp}</div>
                )}
              </div>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            cell: (u) => {
              const locked = u.lockedUntil && u.lockedUntil > now;
              const isSelf = u.id === session.user.id;
              return (
                <div className="flex items-center justify-end gap-1">
                  {locked && canEdit && <UnlockUserButton userId={u.id} />}
                  {canEdit && <ResetPasswordButton userId={u.id} userName={u.name} />}
                  {canEdit && (
                    <Button asChild variant="ghost" size="sm" title="Edit">
                      <Link href={`/users/${u.id}/edit` as never}>
                        <Edit className="h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                  {canDelete && !isSelf && (
                    <DeleteConfirm
                      title={`Delete ${u.name}?`}
                      description="This soft-deletes the account. The user can no longer sign in. History (audit logs, who created what) is preserved."
                      onConfirm={async () => {
                        "use server";
                        return deleteUserAction(u.id);
                      }}
                      triggerLabel=""
                      variant="outline"
                    />
                  )}
                </div>
              );
            },
          },
        ]}
      />

      <TablePagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} />
    </div>
  );
}
