import { notFound } from "next/navigation";
import Link from "next/link";
import { Edit, Phone, Mail, MapPin, Calendar, User, Snowflake, IndianRupee, Receipt, CalendarCheck, Plus, RotateCw } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getMemberById } from "@/server/services/members";
import { deleteMemberAction } from "@/server/actions/members";
import { syncMembershipStatuses } from "@/server/services/membership-status";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { DeleteConfirm } from "@/components/forms/delete-confirm";
import { FreezeRequestForm } from "@/components/forms/freeze-request-form";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatDate, formatDateTime, daysFromNow } from "@/lib/date";
import { formatPaiseShort } from "@/lib/money";
import { BUSINESS_RULES } from "@/constants/business-rules";

export const metadata = { title: "Member profile" };
export const dynamic = "force-dynamic";

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("members:read");
  await syncMembershipStatuses();
  const { id } = await params;
  const member = await getMemberById(session.user.gymId, id);
  if (!member) notFound();

  const canEdit = can(session.user.role, "members:update");
  const canDelete = can(session.user.role, "members:delete");
  const canAssign = can(session.user.role, "memberships:create");
  const canFreeze = can(session.user.role, "memberships:freeze:request");
  const canTakePayment = can(session.user.role, "payments:create");

  const activeMembership = member.memberships.find(
    (m) => m.status === "ACTIVE" || m.status === "EXPIRING_SOON" || m.status === "FROZEN",
  );
  const liveMembership = member.memberships.find(
    (m) => m.status === "ACTIVE" || m.status === "EXPIRING_SOON",
  );
  const payableMembership = member.memberships.find(
    (m) => m.paymentStatus !== "PAID" && m.status !== "CANCELLED" && m.status !== "EXPIRED",
  );
  const phasesUsedOnLive = liveMembership
    ? member.freezes.filter(
        (f) =>
          f.membershipId === liveMembership.id &&
          ["PENDING", "APPROVED", "ACTIVE", "COMPLETED"].includes(f.status),
      ).length
    : 0;

  const deleteAction = async () => {
    "use server";
    return deleteMemberAction(member.id);
  };

  const restoreAction = async () => {
    "use server";
    const { restoreMemberAction } = await import("@/server/actions/members");
    return restoreMemberAction(member.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={member.fullName}
        description={
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs">{member.memberCode}</span>
            <StatusBadge status={member.status} />
          </span>
        }
        actions={
          <>
            {canAssign && !activeMembership && (
              <Button asChild size="sm">
                <Link href={`/memberships/new?memberId=${member.id}` as never}>
                  <Plus className="h-4 w-4" /> Assign membership
                </Link>
              </Button>
            )}
            {canTakePayment && payableMembership && (
              <Button asChild size="sm">
                <Link href={`/payments/new?membershipId=${payableMembership.id}` as never}>
                  <Plus className="h-4 w-4" /> Take payment
                </Link>
              </Button>
            )}
            {canAssign && liveMembership && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/memberships/${liveMembership.id}/renew` as never}>
                  <RotateCw className="h-4 w-4" /> Renew
                </Link>
              </Button>
            )}
            {canFreeze && liveMembership && (
              <FreezeRequestForm
                membershipId={liveMembership.id}
                daysAlreadyUsed={liveMembership.freezeDaysUsed}
                phasesAlreadyUsed={phasesUsedOnLive}
                maxDays={BUSINESS_RULES.freeze.maxDaysPerMembership}
                maxPhases={BUSINESS_RULES.freeze.maxPhases}
              />
            )}
            {canEdit && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/members/${member.id}/edit` as never}>
                  <Edit className="h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
            {canDelete && (
              <DeleteConfirm
                title={`Delete ${member.fullName}?`}
                description="This soft-deletes the member. Memberships and payment history are preserved for audit."
                onConfirm={deleteAction}
                onUndo={restoreAction}
                successMessage="Member deleted."
              />
            )}
          </>
        }
      />

      {/* Quick info grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Contact &amp; personal</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow icon={Phone} label="Phone" value={member.phone} />
            <InfoRow icon={Mail} label="Email" value={member.email} />
            <InfoRow
              icon={User}
              label="Gender"
              value={member.gender === "UNSPECIFIED" ? null : titleCase(member.gender)}
            />
            <InfoRow
              icon={Calendar}
              label="Date of birth"
              value={member.dateOfBirth ? formatDate(member.dateOfBirth) : null}
            />
            <InfoRow icon={Calendar} label="Joining date" value={formatDate(member.joiningDate)} />
            <InfoRow icon={User} label="Assigned trainer" value={member.assignedTrainer?.name} />
            <InfoRow
              icon={MapPin}
              label="Address"
              value={member.address}
              className="sm:col-span-2"
            />
            {(member.emergencyName || member.emergencyPhone) && (
              <InfoRow
                icon={Phone}
                label="Emergency contact"
                value={`${member.emergencyName ?? ""} ${member.emergencyPhone ? `· ${member.emergencyPhone}` : ""}`.trim()}
                className="sm:col-span-2"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active membership</CardTitle>
          </CardHeader>
          <CardContent>
            {activeMembership ? (
              <Link href={`/memberships/${activeMembership.id}` as never} className="block space-y-2 transition-opacity hover:opacity-80">
                <div className="text-base font-medium">{activeMembership.plan.name}</div>
                <StatusBadge status={activeMembership.status} />
                <div className="space-y-1 pt-2 text-sm">
                  <div className="text-muted-foreground">
                    Start: <span className="text-foreground">{formatDate(activeMembership.startDate)}</span>
                  </div>
                  <div className="text-muted-foreground">
                    End: <span className="text-foreground">{formatDate(activeMembership.endDate)}</span>
                    <span className="ml-2 text-xs">
                      ({daysFromNow(activeMembership.endDate)}d)
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    Price:{" "}
                    <span className="text-foreground">
                      {formatPaiseShort(activeMembership.finalPricePaise)}
                    </span>
                  </div>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active membership.{" "}
                {canAssign && (
                  <Link
                    href={`/memberships/new?memberId=${member.id}` as never}
                    className="font-medium text-foreground hover:underline"
                  >
                    Assign one
                  </Link>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs for histories */}
      <Tabs defaultValue="memberships">
        <TabsList>
          <TabsTrigger value="memberships">Memberships</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="freezes">Freezes</TabsTrigger>
          {member.notes && <TabsTrigger value="notes">Notes</TabsTrigger>}
        </TabsList>

        <TabsContent value="memberships">
          <Card>
            <CardContent className="p-5">
              {member.memberships.length === 0 ? (
                <EmptyState icon={Calendar} message="No memberships yet." />
              ) : (
                <ul className="divide-y divide-border">
                  {member.memberships.map((m) => (
                    <li key={m.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div>
                        <div className="font-medium">{m.plan.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(m.startDate)} – {formatDate(m.endDate)} · {formatPaiseShort(m.finalPricePaise)}
                        </div>
                      </div>
                      <StatusBadge status={m.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardContent className="p-5">
              {member.payments.length === 0 ? (
                <EmptyState icon={IndianRupee} message="No payments yet." />
              ) : (
                <ul className="divide-y divide-border">
                  {member.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div>
                        <div className="font-mono text-xs text-muted-foreground">{p.paymentCode}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(p.paymentDate)} · {p.mode}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={p.status} />
                        <div className="text-sm font-semibold tabular-nums">
                          {formatPaiseShort(p.totalPaise)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardContent className="p-5">
              {member.invoices.length === 0 ? (
                <EmptyState icon={Receipt} message="No invoices yet." />
              ) : (
                <ul className="divide-y divide-border">
                  {member.invoices.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div>
                        <div className="font-mono text-sm">{inv.invoiceNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(inv.issueDate)} · {inv.planNameSnapshot}
                        </div>
                      </div>
                      <div className="text-sm font-semibold tabular-nums">
                        {formatPaiseShort(inv.totalPaise)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardContent className="p-5">
              {member.attendances.length === 0 ? (
                <EmptyState icon={CalendarCheck} message="No attendance recorded yet." />
              ) : (
                <ul className="divide-y divide-border">
                  {member.attendances.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="text-sm">{formatDate(a.date)}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.firstInAt ? formatDateTime(a.firstInAt) : "—"} · {a.method}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="freezes">
          <Card>
            <CardContent className="p-5">
              {member.freezes.length === 0 ? (
                <EmptyState icon={Snowflake} message="No freeze history." />
              ) : (
                <ul className="divide-y divide-border">
                  {member.freezes.map((f) => (
                    <li key={f.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div>
                        <div className="text-sm">
                          {formatDate(f.startDate)} – {formatDate(f.endDate)} ({f.days}d)
                        </div>
                        <div className="text-xs text-muted-foreground">{f.reason}</div>
                      </div>
                      <StatusBadge status={f.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {member.notes && (
          <TabsContent value="notes">
            <Card>
              <CardContent className="p-5">
                <p className="whitespace-pre-wrap text-sm">{member.notes}</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof Phone;
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-sm">{value || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
