"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { rupeesToPaise } from "@/lib/money";
import { PlanSchema, type PlanInput } from "@/lib/validations/plan";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createPlanAction(values: PlanInput): Promise<ActionResult<{ id: string }>> {
  const { user } = await requirePermission("plans:create");

  const parsed = PlanSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  try {
    const plan = await prisma.membershipPlan.create({
      data: {
        gymId: user.gymId,
        name: v.name.trim(),
        type: v.type,
        durationValue: v.durationValue,
        durationUnit: v.durationUnit,
        basePricePaise: rupeesToPaise(v.priceRupees),
        description: v.description?.trim() || null,
        allowsInstallments: v.allowsInstallments,
        maxInstallments: v.allowsInstallments ? v.maxInstallments : 1,
        isActive: v.isActive,
        sortOrder: v.sortOrder,
      },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "CREATE",
      entityType: "MembershipPlan",
      entityId: plan.id,
      newValue: { name: plan.name, type: plan.type, basePricePaise: plan.basePricePaise },
    });

    revalidatePath("/plans");
    return { ok: true, data: { id: plan.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function updatePlanAction(id: string, values: PlanInput): Promise<ActionResult> {
  const { user } = await requirePermission("plans:update");

  const parsed = PlanSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const existing = await prisma.membershipPlan.findFirst({
    where: { id, gymId: user.gymId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "Plan not found." };

  try {
    await prisma.membershipPlan.update({
      where: { id },
      data: {
        name: v.name.trim(),
        type: v.type,
        durationValue: v.durationValue,
        durationUnit: v.durationUnit,
        basePricePaise: rupeesToPaise(v.priceRupees),
        description: v.description?.trim() || null,
        allowsInstallments: v.allowsInstallments,
        maxInstallments: v.allowsInstallments ? v.maxInstallments : 1,
        isActive: v.isActive,
        sortOrder: v.sortOrder,
      },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE",
      entityType: "MembershipPlan",
      entityId: id,
      oldValue: {
        name: existing.name,
        basePricePaise: existing.basePricePaise,
        isActive: existing.isActive,
      },
      newValue: { name: v.name, basePricePaise: rupeesToPaise(v.priceRupees), isActive: v.isActive },
    });

    revalidatePath("/plans");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deletePlanAction(id: string): Promise<ActionResult> {
  const { user } = await requirePermission("plans:delete");

  const existing = await prisma.membershipPlan.findFirst({
    where: { id, gymId: user.gymId, deletedAt: null },
    include: { _count: { select: { memberships: { where: { deletedAt: null } } } } },
  });
  if (!existing) return { ok: false, error: "Plan not found." };

  if (existing._count.memberships > 0) {
    return {
      ok: false,
      error: `Cannot delete — ${existing._count.memberships} membership(s) use this plan. Deactivate instead.`,
    };
  }

  try {
    await prisma.membershipPlan.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "SOFT_DELETE",
      entityType: "MembershipPlan",
      entityId: id,
      oldValue: { name: existing.name },
    });

    revalidatePath("/plans");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
