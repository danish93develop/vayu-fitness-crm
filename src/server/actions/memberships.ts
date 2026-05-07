"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { rupeesToPaise } from "@/lib/money";
import { computeEndDate } from "@/lib/membership-utils";
import { addDays } from "@/lib/date";
import {
  AssignMembershipSchema,
  RenewMembershipSchema,
  CancelMembershipSchema,
  type AssignMembershipInput,
  type RenewMembershipInput,
  type CancelMembershipInput,
} from "@/lib/validations/membership";
import { nextMembershipCode } from "@/server/services/memberships";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function assignMembershipAction(
  values: AssignMembershipInput,
): Promise<ActionResult<{ id: string; membershipCode: string }>> {
  const { user } = await requirePermission("memberships:create");

  const parsed = AssignMembershipSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const [member, plan] = await Promise.all([
    prisma.member.findFirst({
      where: { id: v.memberId, gymId: user.gymId, deletedAt: null },
    }),
    prisma.membershipPlan.findFirst({
      where: { id: v.planId, gymId: user.gymId, deletedAt: null, isActive: true },
    }),
  ]);
  if (!member) return { ok: false, error: "Member not found." };
  if (!plan) return { ok: false, error: "Plan not found or inactive." };

  const startDate = new Date(v.startDate);
  const endDate = computeEndDate(startDate, plan.durationValue, plan.durationUnit);
  const discountPaise = rupeesToPaise(v.discountRupees);
  const finalPricePaise = Math.max(0, plan.basePricePaise - discountPaise);
  const membershipCode = await nextMembershipCode(user.gymId);

  try {
    const membership = await prisma.memberMembership.create({
      data: {
        membershipCode,
        gymId: user.gymId,
        branchId: member.branchId,
        memberId: member.id,
        planId: plan.id,
        startDate,
        endDate,
        originalEndDate: endDate,
        status: v.markAsPaid ? "ACTIVE" : "PENDING_PAYMENT",
        basePricePaise: plan.basePricePaise,
        discountPaise,
        finalPricePaise,
        paymentStatus: v.markAsPaid ? "PAID" : "PENDING",
        notes: v.notes?.trim() || null,
        createdById: user.id,
      },
    });

    // Mirror status onto member
    await prisma.member.update({
      where: { id: member.id },
      data: { status: v.markAsPaid ? "ACTIVE" : "PENDING_PAYMENT" },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "CREATE",
      entityType: "MemberMembership",
      entityId: membership.id,
      newValue: {
        membershipCode,
        memberId: member.id,
        planId: plan.id,
        finalPricePaise,
        markAsPaid: v.markAsPaid,
      },
    });

    if (v.discountRupees > 0) {
      await audit({
        gymId: user.gymId,
        userId: user.id,
        action: "DISCOUNT_APPLIED",
        entityType: "MemberMembership",
        entityId: membership.id,
        metadata: {
          discountPaise,
          reason: v.discountReason,
        },
      });
    }

    revalidatePath("/memberships");
    revalidatePath(`/members/${member.id}`);
    return { ok: true, data: { id: membership.id, membershipCode } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function renewMembershipAction(
  oldMembershipId: string,
  values: RenewMembershipInput,
): Promise<ActionResult<{ id: string; membershipCode: string }>> {
  const { user } = await requirePermission("memberships:create");

  const parsed = RenewMembershipSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const old = await prisma.memberMembership.findFirst({
    where: { id: oldMembershipId, gymId: user.gymId, deletedAt: null },
    include: { member: true },
  });
  if (!old) return { ok: false, error: "Original membership not found." };

  const plan = await prisma.membershipPlan.findFirst({
    where: { id: v.planId, gymId: user.gymId, deletedAt: null, isActive: true },
  });
  if (!plan) return { ok: false, error: "Plan not found or inactive." };

  const startDate = new Date(v.startDate);
  const endDate = computeEndDate(startDate, plan.durationValue, plan.durationUnit);
  const discountPaise = rupeesToPaise(v.discountRupees);
  const finalPricePaise = Math.max(0, plan.basePricePaise - discountPaise);
  const membershipCode = await nextMembershipCode(user.gymId);

  try {
    const newMembership = await prisma.$transaction(async (tx) => {
      const created = await tx.memberMembership.create({
        data: {
          membershipCode,
          gymId: user.gymId,
          branchId: old.branchId,
          memberId: old.memberId,
          planId: plan.id,
          startDate,
          endDate,
          originalEndDate: endDate,
          status: v.markAsPaid ? "ACTIVE" : "PENDING_PAYMENT",
          basePricePaise: plan.basePricePaise,
          discountPaise,
          finalPricePaise,
          paymentStatus: v.markAsPaid ? "PAID" : "PENDING",
          notes: v.notes?.trim() || null,
          createdById: user.id,
        },
      });

      // Mark old as expired if it has been replaced and old has ended
      if (old.endDate < new Date()) {
        await tx.memberMembership.update({
          where: { id: old.id },
          data: { status: "EXPIRED" },
        });
      }

      // Update member status to whatever the new membership is
      await tx.member.update({
        where: { id: old.memberId },
        data: { status: v.markAsPaid ? "ACTIVE" : "PENDING_PAYMENT" },
      });

      return created;
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "MEMBERSHIP_RENEWED",
      entityType: "MemberMembership",
      entityId: newMembership.id,
      metadata: {
        previousMembershipId: old.id,
        newMembershipCode: membershipCode,
        finalPricePaise,
      },
    });

    revalidatePath("/memberships");
    revalidatePath(`/members/${old.memberId}`);
    return { ok: true, data: { id: newMembership.id, membershipCode } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function cancelMembershipAction(
  id: string,
  values: CancelMembershipInput,
): Promise<ActionResult> {
  const { user } = await requirePermission("memberships:cancel");

  const parsed = CancelMembershipSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.memberMembership.findFirst({
    where: { id, gymId: user.gymId, deletedAt: null },
    include: { member: true },
  });
  if (!existing) return { ok: false, error: "Membership not found." };
  if (existing.status === "CANCELLED") {
    return { ok: false, error: "Membership already cancelled." };
  }

  try {
    await prisma.memberMembership.update({
      where: { id },
      data: { status: "CANCELLED", notes: existing.notes ? `${existing.notes}\n\nCancelled: ${parsed.data.reason}` : `Cancelled: ${parsed.data.reason}` },
    });

    // If this was their only active membership, mark member as cancelled too
    const otherActive = await prisma.memberMembership.count({
      where: {
        memberId: existing.memberId,
        deletedAt: null,
        status: { in: ["ACTIVE", "EXPIRING_SOON", "FROZEN"] },
        id: { not: id },
      },
    });
    if (otherActive === 0) {
      await prisma.member.update({
        where: { id: existing.memberId },
        data: { status: "CANCELLED" },
      });
    }

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE",
      entityType: "MemberMembership",
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: "CANCELLED" },
      metadata: { reason: parsed.data.reason },
    });

    revalidatePath("/memberships");
    revalidatePath(`/memberships/${id}`);
    revalidatePath(`/members/${existing.memberId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function activateMembershipAction(id: string): Promise<ActionResult> {
  // Convenience action — flip a PENDING_PAYMENT membership to ACTIVE.
  // Phase 6 will replace this with the real "record payment" flow.
  const { user } = await requirePermission("memberships:update");

  const existing = await prisma.memberMembership.findFirst({
    where: { id, gymId: user.gymId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "Membership not found." };
  if (existing.status !== "PENDING_PAYMENT") {
    return { ok: false, error: "Only PENDING_PAYMENT memberships can be activated this way." };
  }

  try {
    await prisma.memberMembership.update({
      where: { id },
      data: { status: "ACTIVE", paymentStatus: "PAID" },
    });
    await prisma.member.update({
      where: { id: existing.memberId },
      data: { status: "ACTIVE" },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE",
      entityType: "MemberMembership",
      entityId: id,
      oldValue: { status: "PENDING_PAYMENT" },
      newValue: { status: "ACTIVE", paymentStatus: "PAID" },
      metadata: { quickActivate: true },
    });

    revalidatePath("/memberships");
    revalidatePath(`/memberships/${id}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// Helper exposed for use by the freeze approval flow
export async function extendMembershipEndDate(
  membershipId: string,
  days: number,
  tx: typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
) {
  const m = await tx.memberMembership.findUnique({ where: { id: membershipId } });
  if (!m) throw new Error("Membership not found while extending");
  await tx.memberMembership.update({
    where: { id: membershipId },
    data: {
      endDate: addDays(m.endDate, days),
      freezeDaysUsed: m.freezeDaysUsed + days,
    },
  });
}
