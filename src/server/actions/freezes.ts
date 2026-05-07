"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/server/services/notifications";
import { addDays, startOfDay } from "@/lib/date";
import { inclusiveDays } from "@/lib/membership-utils";
import { BUSINESS_RULES } from "@/constants/business-rules";
import {
  FreezeRequestSchema,
  FreezeRejectSchema,
  type FreezeRequestInput,
  type FreezeRejectInput,
} from "@/lib/validations/freeze";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const { maxDaysPerMembership, maxPhases } = BUSINESS_RULES.freeze;

export async function requestFreezeAction(
  values: FreezeRequestInput,
): Promise<ActionResult<{ id: string }>> {
  const { user } = await requirePermission("memberships:freeze:request");

  const parsed = FreezeRequestSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const membership = await prisma.memberMembership.findFirst({
    where: { id: v.membershipId, gymId: user.gymId, deletedAt: null },
    include: { member: true, freezes: true },
  });
  if (!membership) return { ok: false, error: "Membership not found." };

  if (!["ACTIVE", "EXPIRING_SOON"].includes(membership.status)) {
    return {
      ok: false,
      error: `Cannot freeze a ${membership.status.toLowerCase().replace("_", " ")} membership.`,
    };
  }

  const startDate = startOfDay(new Date(v.startDate));
  const endDate = startOfDay(new Date(v.endDate));
  const days = inclusiveDays(startDate, endDate);

  if (days < 1) return { ok: false, error: "Freeze must be at least 1 day." };

  // Existing freezes count toward the cap (PENDING + APPROVED + ACTIVE + COMPLETED)
  const usedDays = membership.freezes
    .filter((f) => ["PENDING", "APPROVED", "ACTIVE", "COMPLETED"].includes(f.status))
    .reduce((sum, f) => sum + f.days, 0);

  if (usedDays + days > maxDaysPerMembership) {
    return {
      ok: false,
      error: `Total freeze days would exceed the ${maxDaysPerMembership}-day limit (already used ${usedDays}d, requesting ${days}d).`,
    };
  }

  const phasesUsed = membership.freezes.filter((f) =>
    ["PENDING", "APPROVED", "ACTIVE", "COMPLETED"].includes(f.status),
  ).length;
  if (phasesUsed >= maxPhases) {
    return {
      ok: false,
      error: `Maximum ${maxPhases} freeze phases per membership. This member has used all of them.`,
    };
  }

  try {
    const freeze = await prisma.membershipFreeze.create({
      data: {
        gymId: user.gymId,
        branchId: membership.branchId,
        memberId: membership.memberId,
        membershipId: membership.id,
        startDate,
        endDate,
        days,
        reason: v.reason.trim(),
        status: "PENDING",
        requestedById: user.id,
      },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "CREATE",
      entityType: "MembershipFreeze",
      entityId: freeze.id,
      newValue: { membershipId: membership.id, days, startDate, endDate },
    });

    await notifyAdmins(user.gymId, {
      type: "FREEZE_REQUEST",
      title: "Freeze request needs approval",
      message: `${membership.member.fullName} requested a ${days}-day freeze. Reason: "${v.reason.trim()}"`,
      link: `/memberships/freezes`,
      metadata: { freezeId: freeze.id, days },
    });

    revalidatePath(`/memberships/${membership.id}`);
    revalidatePath(`/members/${membership.memberId}`);
    revalidatePath("/memberships/freezes");
    return { ok: true, data: { id: freeze.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function approveFreezeAction(freezeId: string): Promise<ActionResult> {
  const { user } = await requirePermission("memberships:freeze:approve");

  const freeze = await prisma.membershipFreeze.findFirst({
    where: { id: freezeId, gymId: user.gymId },
  });
  if (!freeze) return { ok: false, error: "Freeze request not found." };
  if (freeze.status !== "PENDING") {
    return { ok: false, error: "Only PENDING freezes can be approved." };
  }

  const today = startOfDay(new Date());
  const startsToday = freeze.startDate <= today && freeze.endDate >= today;

  try {
    await prisma.$transaction(async (tx) => {
      // Approve and (optionally) activate today
      await tx.membershipFreeze.update({
        where: { id: freezeId },
        data: {
          status: startsToday ? "ACTIVE" : "APPROVED",
          approvedById: user.id,
          approvedAt: new Date(),
        },
      });

      // Extend membership endDate by `days` and bump freezeDaysUsed
      const m = await tx.memberMembership.findUnique({
        where: { id: freeze.membershipId },
      });
      if (!m) throw new Error("Membership not found");
      await tx.memberMembership.update({
        where: { id: freeze.membershipId },
        data: {
          endDate: addDays(m.endDate, freeze.days),
          freezeDaysUsed: m.freezeDaysUsed + freeze.days,
          ...(startsToday && { status: "FROZEN" }),
        },
      });

      if (startsToday) {
        await tx.member.update({
          where: { id: freeze.memberId },
          data: { status: "FROZEN" },
        });
      }
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "MEMBERSHIP_FROZEN",
      entityType: "MembershipFreeze",
      entityId: freezeId,
      newValue: { status: startsToday ? "ACTIVE" : "APPROVED" },
      metadata: { days: freeze.days, membershipId: freeze.membershipId },
    });

    revalidatePath(`/memberships/${freeze.membershipId}`);
    revalidatePath(`/members/${freeze.memberId}`);
    revalidatePath("/memberships/freezes");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function rejectFreezeAction(
  freezeId: string,
  values: FreezeRejectInput,
): Promise<ActionResult> {
  const { user } = await requirePermission("memberships:freeze:approve");

  const parsed = FreezeRejectSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const freeze = await prisma.membershipFreeze.findFirst({
    where: { id: freezeId, gymId: user.gymId },
  });
  if (!freeze) return { ok: false, error: "Freeze request not found." };
  if (freeze.status !== "PENDING") {
    return { ok: false, error: "Only PENDING freezes can be rejected." };
  }

  try {
    await prisma.membershipFreeze.update({
      where: { id: freezeId },
      data: {
        status: "REJECTED",
        approvedById: user.id, // who handled it
        approvedAt: new Date(),
        rejectionReason: parsed.data.rejectionReason.trim(),
      },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE",
      entityType: "MembershipFreeze",
      entityId: freezeId,
      oldValue: { status: "PENDING" },
      newValue: { status: "REJECTED" },
      metadata: { rejectionReason: parsed.data.rejectionReason },
    });

    revalidatePath(`/memberships/${freeze.membershipId}`);
    revalidatePath(`/members/${freeze.memberId}`);
    revalidatePath("/memberships/freezes");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
