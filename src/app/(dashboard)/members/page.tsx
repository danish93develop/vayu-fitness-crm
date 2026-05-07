import Link from "next/link";
import { Upload } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { listMembers } from "@/server/services/members";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { MembersTable } from "@/components/tables/members-table";
import { TablePagination } from "@/components/tables/pagination";
import type { MemberStatus } from "@prisma/client";

export const metadata = { title: "Members" };
export const dynamic = "force-dynamic";

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRING_SOON", label: "Expiring soon" },
  { value: "EXPIRED", label: "Expired" },
  { value: "FROZEN", label: "Frozen" },
  { value: "PENDING_PAYMENT", label: "Pending payment" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await requirePermission("members:read");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { items, total, pageCount, pageSize } = await listMembers(session.user.gymId, {
    search: sp.q ?? "",
    status: (sp.status as MemberStatus | undefined) ?? "ALL",
    page,
    pageSize: 20,
  });

  const canDelete = can(session.user.role, "members:delete");

  // Map to the plain shape MembersTable expects (no Prisma classes across boundary)
  const rows = items.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    memberCode: m.memberCode,
    phone: m.phone,
    status: m.status,
    joiningDate: m.joiningDate,
    profilePhotoUrl: m.profilePhotoUrl,
    assignedTrainer: m.assignedTrainer ? { name: m.assignedTrainer.name } : null,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Members"
        description="All registered members. Click any row to open the profile, or select multiple to act on them in bulk."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={"/members/import" as never}>
              <Upload className="h-4 w-4" /> Import CSV
            </Link>
          </Button>
        }
      />

      <TableToolbar
        searchPlaceholder="Search by name, phone, code…"
        filterLabel="Status"
        filterOptions={statusOptions}
        newHref="/members/new"
        newLabel="Add member"
      />

      <MembersTable rows={rows} canDelete={canDelete} />

      <TablePagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} />
    </div>
  );
}
