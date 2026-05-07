import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getMembershipById } from "@/server/services/memberships";
import { listActivePlans } from "@/server/services/plans";
import { PageHeader } from "@/components/layout/page-header";
import { RenewMembershipForm } from "@/components/forms/renew-membership-form";

export const metadata = { title: "Renew membership" };
export const dynamic = "force-dynamic";

export default async function RenewMembershipPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("memberships:create");
  const { id } = await params;
  const [membership, plans] = await Promise.all([
    getMembershipById(session.user.gymId, id),
    listActivePlans(session.user.gymId),
  ]);
  if (!membership) notFound();

  const canDiscount =
    can(session.user.role, "payments:discount:any") ||
    can(session.user.role, "payments:discount:limited");

  return (
    <div className="space-y-6">
      <PageHeader title={`Renew ${membership.member.fullName}'s membership`} />
      <RenewMembershipForm
        oldMembershipId={membership.id}
        oldEndDate={membership.endDate.toISOString()}
        oldPlanId={membership.planId}
        plans={plans}
        canDiscount={canDiscount}
        memberId={membership.member.id}
        memberName={membership.member.fullName}
      />
    </div>
  );
}
