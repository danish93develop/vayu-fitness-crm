"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { TrainerSchema, type TrainerInput } from "@/lib/validations/trainer";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createTrainerAction(
  values: TrainerInput,
): Promise<ActionResult<{ id: string }>> {
  const { user } = await requirePermission("trainers:create");

  const parsed = TrainerSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const branch = await prisma.branch.findFirst({
    where: { gymId: user.gymId, deletedAt: null, isDefault: true },
  });
  if (!branch) return { ok: false, error: "No default branch configured." };

  try {
    const trainer = await prisma.trainer.create({
      data: {
        gymId: user.gymId,
        branchId: branch.id,
        name: v.name.trim(),
        phone: v.phone?.trim() || null,
        email: v.email?.trim() || null,
        specialization: v.specialization?.trim() || null,
        bio: v.bio?.trim() || null,
        isActive: v.isActive,
      },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "CREATE",
      entityType: "Trainer",
      entityId: trainer.id,
      newValue: { name: trainer.name, specialization: trainer.specialization },
    });

    revalidatePath("/trainers");
    return { ok: true, data: { id: trainer.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function updateTrainerAction(
  id: string,
  values: TrainerInput,
): Promise<ActionResult> {
  const { user } = await requirePermission("trainers:update");

  const parsed = TrainerSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const existing = await prisma.trainer.findFirst({
    where: { id, gymId: user.gymId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "Trainer not found." };

  try {
    await prisma.trainer.update({
      where: { id },
      data: {
        name: v.name.trim(),
        phone: v.phone?.trim() || null,
        email: v.email?.trim() || null,
        specialization: v.specialization?.trim() || null,
        bio: v.bio?.trim() || null,
        isActive: v.isActive,
      },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE",
      entityType: "Trainer",
      entityId: id,
      oldValue: { name: existing.name, isActive: existing.isActive },
      newValue: { name: v.name, isActive: v.isActive },
    });

    revalidatePath("/trainers");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteTrainerAction(id: string): Promise<ActionResult> {
  const { user } = await requirePermission("trainers:delete");

  const existing = await prisma.trainer.findFirst({
    where: { id, gymId: user.gymId, deletedAt: null },
    include: { _count: { select: { assignedMembers: { where: { deletedAt: null } } } } },
  });
  if (!existing) return { ok: false, error: "Trainer not found." };

  if (existing._count.assignedMembers > 0) {
    return {
      ok: false,
      error: `Cannot delete — ${existing._count.assignedMembers} member(s) are assigned. Reassign or unset them first.`,
    };
  }

  try {
    await prisma.trainer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "SOFT_DELETE",
      entityType: "Trainer",
      entityId: id,
      oldValue: { name: existing.name },
    });

    revalidatePath("/trainers");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteTrainerAndRedirect(id: string): Promise<never> {
  const result = await deleteTrainerAction(id);
  if (!result.ok) throw new Error(result.error);
  redirect("/trainers");
}
