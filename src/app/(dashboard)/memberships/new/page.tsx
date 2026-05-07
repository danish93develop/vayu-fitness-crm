import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { listActivePlans } from "@/server/services/plans";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { AssignMembershipForm } from "@/components/forms/assign-membership-form";

export const metadata = { title: "Assign membership" };
export const dynamic = "force-dynamic";

export default async function AssignMembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string }>;
}) {
  const session = await requirePermission("memberships:create");
  const sp = await searchParams;
  const [members, plans] = await Promise.all([
    prisma.member.findMany({
      where: { gymId: session.user.gymId, deletedAt: null },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, memberCode: true },
    }),
    listActivePlans(session.user.gymId),
  ]);

  const canDiscount =
    can(session.user.role, "payments:discount:any") ||
    can(session.user.role, "payments:discount:limited");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assign membership"
        description="Pick a member and a plan. Pricing and end date are computed automatically."
      />
      <AssignMembershipForm
        members={members}
        plans={plans}
        defaultMemberId={sp.memberId}
        canDiscount={canDiscount}
      />
    </div>
  );
}
