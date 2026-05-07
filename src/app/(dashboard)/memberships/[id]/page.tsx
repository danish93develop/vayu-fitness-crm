import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, RotateCw, Snowflake, IndianRupee } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getMembershipById } from "@/server/services/memberships";
import { syncMembershipStatuses } from "@/server/services/membership-status";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FreezeRequestForm } from "@/components/forms/freeze-request-form";
import { FreezeApproveButton, FreezeRejectButton } from "@/components/forms/freeze-actions";
import { CancelMembershipButton } from "@/components/forms/cancel-membership-button";
import { ActivateMembershipButton } from "@/components/forms/activate-membership-button";
import { formatDate, daysFromNow } from "@/lib/date";
import { formatPaiseShort } from "@/lib/money";
import { formatDuration } from "@/lib/membership-utils";
import { BUSINESS_RULES } from "@/constants/business-rules";

export const metadata = { title: "Membership" };
export const dynamic = "force-dynamic";

export default async function MembershipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("memberships:read");
  await syncMembershipStatuses();
  const { id } = await params;
  const m = await getMembershipById(session.user.gymId, id);
  if (!m) notFound();

  const canFreeze = can(session.user.role, "memberships:freeze:request");
  const canApproveFreeze = can(session.user.role, "memberships:freeze:approve");
  const canCancel = can(session.user.role, "memberships:cancel");
  const canRenew = can(session.user.role, "memberships:create");
  const canActivate = can(session.user.role, "memberships:update");
  const canTakePayment = can(session.user.role, "payments:create");
  const needsPayment = m.paymentStatus !== "PAID" && m.status !== "CANCELLED";

  const freezeDaysUsed = m.freezeDaysUsed;
  const phasesUsed = m.freezes.filter((f) =>
    ["PENDING", "APPROVED", "ACTIVE", "COMPLETED"].includes(f.status),
  ).length;
  const isLive = m.status === "ACTIVE" || m.status === "EXPIRING_SOON";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${m.member.fullName} — ${m.plan.name}`}
        description={
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs">{m.membershipCode}</span>
            <StatusBadge status={m.status} />
          </span>
        }
        actions={
          <>
            {needsPayment && canTakePayment && (
              <Button asChild>
                <Link href={`/payments/new?membershipId=${m.id}` as never}>
                  <IndianRupee className="h-4 w-4" /> Take payment
                </Link>
              </Button>
            )}
            {m.status === "PENDING_PAYMENT" && canActivate && (
              <ActivateMembershipButton membershipId={m.id} />
            )}
            {isLive && canFreeze && (
              <FreezeRequestForm
                membershipId={m.id}
                daysAlreadyUsed={freezeDaysUsed}
                phasesAlreadyUsed={phasesUsed}
                maxDays={BUSINESS_RULES.freeze.maxDaysPerMembership}
                maxPhases={BUSINESS_RULES.freeze.maxPhases}
              />
            )}
            {canRenew && (m.status === "EXPIRED" || m.status === "EXPIRING_SOON") && (
              <Button asChild>
                <Link href={`/memberships/${m.id}/renew` as never}>
                  <RotateCw className="h-4 w-4" /> Renew
                </Link>
              </Button>
            )}
            {canCancel && m.status !== "CANCELLED" && m.status !== "EXPIRED" && (
              <CancelMembershipButton membershipId={m.id} />
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Membership details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Plan" value={`${m.plan.name} · ${formatDuration(m.plan.durationValue, m.plan.durationUnit)}`} />
            <Field label="Type" value={titleCase(m.plan.type)} />
            <Field label="Start date" value={formatDate(m.startDate)} />
            <Field
              label="End date"
              value={
                <>
                  {formatDate(m.endDate)}
                  {isLive && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({daysFromNow(m.endDate)}d)
                    </span>
                  )}
                  {m.endDate.getTime() !== m.originalEndDate.getTime() && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (original: {formatDate(m.originalEndDate)})
                    </span>
                  )}
                </>
              }
            />
            <Field label="Base price" value={formatPaiseShort(m.basePricePaise)} />
            <Field
              label="Discount"
              value={
                m.discountPaise > 0 ? formatPaiseShort(m.discountPaise) : <span className="text-muted-foreground">—</span>
              }
            />
            <Field label="Final price" value={<span className="font-semibold">{formatPaiseShort(m.finalPricePaise)}</span>} />
            <Field label="Payment status" value={<StatusBadge status={m.paymentStatus} />} />
            <Field label="Created by" value={m.createdBy?.name ?? "—"} />
            <Field label="Member" value={
              <Link href={`/members/${m.member.id}` as never} className="font-medium hover:underline">
                {m.member.fullName} ({m.member.memberCode})
              </Link>
            } />
            {m.notes && (
              <Field label="Notes" value={<span className="whitespace-pre-wrap">{m.notes}</span>} className="sm:col-span-2" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Freezes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md bg-muted/40 p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{freezeDaysUsed}</span>
                <span className="text-xs text-muted-foreground">/ {BUSINESS_RULES.freeze.maxDaysPerMembership}d used</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {phasesUsed} of {BUSINESS_RULES.freeze.maxPhases} phases used
              </div>
            </div>

            {m.freezes.length === 0 ? (
              <EmptyState icon={Snowflake} message="No freeze history." />
            ) : (
              <ul className="space-y-2">
                {m.freezes.map((f) => (
                  <li key={f.id} className="rounded-md border border-border bg-background p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDate(f.startDate)} – {formatDate(f.endDate)}</span>
                      <Badge variant="outline">{f.days}d</Badge>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <StatusBadge status={f.status} />
                      {f.approvedBy && (
                        <span className="text-xs text-muted-foreground">
                          {f.status === "REJECTED" ? "Rejected" : "Approved"} by {f.approvedBy.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{f.reason}</p>
                    {f.rejectionReason && (
                      <p className="mt-1 text-xs text-destructive">
                        Rejection reason: {f.rejectionReason}
                      </p>
                    )}
                    {f.status === "PENDING" && canApproveFreeze && (
                      <div className="mt-2 flex items-center gap-2">
                        <FreezeApproveButton freezeId={f.id} />
                        <FreezeRejectButton freezeId={f.id} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payments tab — phase 6 will fill this in */}
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {m.payments.length === 0 ? (
            <EmptyState icon={ArrowRight} message="No payments yet. Use the Payments module (Phase 6) to record one." />
          ) : (
            <ul className="divide-y divide-border">
              {m.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">{p.paymentCode}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(p.paymentDate)} · {p.mode}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={p.status} />
                    <span className="text-sm font-semibold tabular-nums">
                      {formatPaiseShort(p.totalPaise)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function titleCase(s: string) {
  return s.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
