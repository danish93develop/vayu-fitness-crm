import Link from "next/link";
import { Snowflake } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { listFreezes } from "@/server/services/freezes";
import { syncMembershipStatuses } from "@/server/services/membership-status";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FreezeApproveButton, FreezeRejectButton } from "@/components/forms/freeze-actions";
import { formatDate, relativeTime } from "@/lib/date";
import type { FreezeStatus } from "@prisma/client";

export const metadata = { title: "Freeze requests" };
export const dynamic = "force-dynamic";

const statusOptions: { value: FreezeStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" },
];

export default async function FreezeRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requirePermission("memberships:read");
  await syncMembershipStatuses();
  const sp = await searchParams;
  const status = (sp.status as FreezeStatus | undefined) ?? "PENDING";

  const { items } = await listFreezes(session.user.gymId, { status, pageSize: 50 });
  const canApprove = can(session.user.role, "memberships:freeze:approve");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Freeze requests"
        description="Pending freezes need approval from a manager or admin. Approving extends the membership end date by the freeze duration."
      />

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((o) => (
          <Link
            key={o.value}
            href={`/memberships/freezes${o.value === "ALL" ? "" : `?status=${o.value}`}` as never}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              status === o.value
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {o.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState icon={Snowflake} message={`No ${status === "PENDING" ? "pending" : status.toLowerCase()} freezes.`} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/members/${f.member.id}` as never}
                        className="font-medium hover:underline"
                      >
                        {f.member.fullName}
                      </Link>
                      <span className="font-mono text-xs text-muted-foreground">
                        {f.member.memberCode}
                      </span>
                      <StatusBadge status={f.status} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {f.membership.plan.name} ·{" "}
                      <Link href={`/memberships/${f.membership.id}` as never} className="hover:underline">
                        view membership
                      </Link>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                      <span>
                        {formatDate(f.startDate)} – {formatDate(f.endDate)}
                      </span>
                      <Badge variant="outline">{f.days}d</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      &ldquo;{f.reason}&rdquo;
                    </p>
                    {f.rejectionReason && (
                      <p className="mt-1 text-xs text-destructive">
                        Rejection: {f.rejectionReason}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Requested by {f.requestedBy?.name ?? "—"} {relativeTime(f.createdAt)}
                      {f.approvedBy && (
                        <>
                          {" · "}
                          {f.status === "REJECTED" ? "Rejected" : "Approved"} by {f.approvedBy.name}
                        </>
                      )}
                    </p>
                  </div>

                  {f.status === "PENDING" && canApprove && (
                    <div className="flex shrink-0 items-center gap-2">
                      <FreezeApproveButton freezeId={f.id} />
                      <FreezeRejectButton freezeId={f.id} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
