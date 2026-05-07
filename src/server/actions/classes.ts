"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { ClassSchema, type ClassInput } from "@/lib/validations/class";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Combine a date string + HH:MM into a Date */
function combine(dateStr: string, timeStr: string): Date {
  const d = new Date(dateStr);
  const [h, m] = timeStr.split(":").map(Number) as [number, number];
  d.setHours(h, m, 0, 0);
  return d;
}

export async function createClassAction(values: ClassInput): Promise<ActionResult<{ id: string }>> {
  const { user } = await requirePermission("classes:create");

  const parsed = ClassSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const branch = await prisma.branch.findFirst({
    where: { gymId: user.gymId, deletedAt: null, isDefault: true },
  });
  if (!branch) return { ok: false, error: "No default branch configured." };

  try {
    const created = await prisma.class.create({
      data: {
        gymId: user.gymId,
        branchId: branch.id,
        name: v.name.trim(),
        trainerId: v.trainerId || null,
        date: new Date(v.date),
        startTime: combine(v.date, v.startTime),
        endTime: combine(v.date, v.endTime),
        capacity: v.capacity,
        status: v.status,
        notes: v.notes?.trim() || null,
      },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "CREATE",
      entityType: "Class",
      entityId: created.id,
      newValue: { name: created.name, date: v.date, startTime: v.startTime },
    });

    revalidatePath("/classes");
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function updateClassAction(id: string, values: ClassInput): Promise<ActionResult> {
  const { user } = await requirePermission("classes:update");

  const parsed = ClassSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const existing = await prisma.class.findFirst({
    where: { id, gymId: user.gymId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "Class not found." };

  try {
    await prisma.class.update({
      where: { id },
      data: {
        name: v.name.trim(),
        trainerId: v.trainerId || null,
        date: new Date(v.date),
        startTime: combine(v.date, v.startTime),
        endTime: combine(v.date, v.endTime),
        capacity: v.capacity,
        status: v.status,
        notes: v.notes?.trim() || null,
      },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE",
      entityType: "Class",
      entityId: id,
      oldValue: { name: existing.name, status: existing.status },
      newValue: { name: v.name, status: v.status },
    });

    revalidatePath("/classes");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteClassAction(id: string): Promise<ActionResult> {
  const { user } = await requirePermission("classes:delete");

  const existing = await prisma.class.findFirst({
    where: { id, gymId: user.gymId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "Class not found." };

  try {
    await prisma.class.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "SOFT_DELETE",
      entityType: "Class",
      entityId: id,
      oldValue: { name: existing.name },
    });

    revalidatePath("/classes");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
