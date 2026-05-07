import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { getMembershipBalance } from "@/server/actions/payments";
import { PageHeader } from "@/components/layout/page-header";
import { PaymentForm } from "@/components/forms/payment-form";

export const metadata = { title: "Take payment" };
export const dynamic = "force-dynamic";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ membershipId?: string; memberId?: string }>;
}) {
  const session = await requirePermission("payments:create");
  const sp = await searchParams;

  // If only memberId provided, find their active/pending membership
  let membershipId = sp.membershipId;
  if (!membershipId && sp.memberId) {
    const m = await prisma.memberMembership.findFirst({
      where: {
        gymId: session.user.gymId,
        memberId: sp.memberId,
        deletedAt: null,
        status: { notIn: ["CANCELLED", "EXPIRED"] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    membershipId = m?.id;
  }

  if (!membershipId) {
    // No specific membership — show a chooser by redirecting to memberships list
    // (Phase 6 keeps the flow simple — staff picks a member's active membership first)
    redirect("/memberships");
  }

  const membership = await prisma.memberMembership.findFirst({
    where: { id: membershipId, gymId: session.user.gymId, deletedAt: null },
    include: {
      member: { select: { id: true, fullName: true, memberCode: true } },
      plan: {
        select: {
          id: true,
          name: true,
          durationValue: true,
          durationUnit: true,
          allowsInstallments: true,
        },
      },
      installments: { select: { installmentNumber: true, amountPaise: true, status: true } },
    },
  });
  if (!membership) notFound();

  const balance = await getMembershipBalance(membership.id, session.user.gymId);
  if (!balance) notFound();

  const pendingInstallment = membership.installments.find((i) => i.status === "PENDING");

  const canDiscount =
    can(session.user.role, "payments:discount:any") ||
    can(session.user.role, "payments:discount:limited");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Take payment"
        description={`Record a payment for ${membership.member.fullName}.`}
      />
      <PaymentForm
        membership={{
          id: membership.id,
          membershipCode: membership.membershipCode,
          finalPricePaise: membership.finalPricePaise,
          paymentStatus: membership.paymentStatus,
          status: membership.status,
          member: membership.member,
          plan: membership.plan,
          paid: balance.paid,
          remaining: balance.remaining,
          totalDue: balance.totalDue,
          pendingInstallment: pendingInstallment
            ? {
                number: pendingInstallment.installmentNumber,
                amountPaise: pendingInstallment.amountPaise,
              }
            : null,
          hasInstallments: membership.installments.length > 0,
        }}
        gstPercent={balance.gstPercent}
        canDiscount={canDiscount}
      />
    </div>
  );
}
