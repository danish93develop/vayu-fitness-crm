"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { MemberSchema, type MemberInput } from "@/lib/validations/member";
import { nextMemberCode } from "@/server/services/members";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createMemberAction(
  values: MemberInput,
): Promise<ActionResult<{ id: string; memberCode: string }>> {
  const session = await requirePermission("members:create");
  const { user } = session;

  const parsed = MemberSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  // Default branch — when multi-branch lands, this comes from a branch picker
  const branch = await prisma.branch.findFirst({
    where: { gymId: user.gymId, deletedAt: null, isDefault: true },
  });
  if (!branch) return { ok: false, error: "No default branch configured." };

  const memberCode = await nextMemberCode(user.gymId);

  try {
    const member = await prisma.member.create({
      data: {
        memberCode,
        gymId: user.gymId,
        branchId: branch.id,
        fullName: v.fullName.trim(),
        phone: v.phone.trim(),
        email: v.email?.trim() || null,
        gender: v.gender,
        dateOfBirth: v.dateOfBirth ? new Date(v.dateOfBirth) : null,
        address: v.address?.trim() || null,
        emergencyName: v.emergencyName?.trim() || null,
        emergencyPhone: v.emergencyPhone?.trim() || null,
        joiningDate: new Date(v.joiningDate),
        assignedTrainerId: v.assignedTrainerId || null,
        notes: v.notes?.trim() || null,
        createdById: user.id,
      },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "CREATE",
      entityType: "Member",
      entityId: member.id,
      newValue: { memberCode, fullName: member.fullName },
    });

    revalidatePath("/members");
    return { ok: true, data: { id: member.id, memberCode } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function updateMemberAction(
  id: string,
  values: MemberInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requirePermission("members:update");
  const { user } = session;

  const parsed = MemberSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const existing = await prisma.member.findFirst({
    where: { id, gymId: user.gymId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "Member not found." };

  try {
    const updated = await prisma.member.update({
      where: { id },
      data: {
        fullName: v.fullName.trim(),
        phone: v.phone.trim(),
        email: v.email?.trim() || null,
        gender: v.gender,
        dateOfBirth: v.dateOfBirth ? new Date(v.dateOfBirth) : null,
        address: v.address?.trim() || null,
        emergencyName: v.emergencyName?.trim() || null,
        emergencyPhone: v.emergencyPhone?.trim() || null,
        joiningDate: new Date(v.joiningDate),
        assignedTrainerId: v.assignedTrainerId || null,
        notes: v.notes?.trim() || null,
      },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE",
      entityType: "Member",
      entityId: id,
      oldValue: {
        fullName: existing.fullName,
        phone: existing.phone,
        email: existing.email,
        assignedTrainerId: existing.assignedTrainerId,
      },
      newValue: {
        fullName: updated.fullName,
        phone: updated.phone,
        email: updated.email,
        assignedTrainerId: updated.assignedTrainerId,
      },
    });

    revalidatePath("/members");
    revalidatePath(`/members/${id}`);
    return { ok: true, data: { id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteMemberAction(id: string): Promise<ActionResult> {
  const session = await requirePermission("members:delete");
  const { user } = session;

  const existing = await prisma.member.findFirst({
    where: { id, gymId: user.gymId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "Member not found." };

  try {
    await prisma.member.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "SOFT_DELETE",
      entityType: "Member",
      entityId: id,
      oldValue: { fullName: existing.fullName, memberCode: existing.memberCode },
    });

    revalidatePath("/members");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteMemberAndRedirect(id: string): Promise<never> {
  const result = await deleteMemberAction(id);
  if (!result.ok) throw new Error(result.error);
  redirect("/members");
}

/**
 * Bulk soft-delete. We loop one member at a time so each delete still gets
 * the same audit trail + tenant check as the single-row action — the work
 * isn't worth a separate optimised path, and at most a few hundred members
 * are ever selected at once.
 */
export async function bulkDeleteMembersAction(
  ids: string[],
): Promise<ActionResult<{ deleted: number; skipped: number }>> {
  const session = await requirePermission("members:delete");
  const { user } = session;

  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "Nothing selected." };
  }
  // Hard cap so a runaway click can't take down the gym
  if (ids.length > 200) {
    return { ok: false, error: "Too many at once — please select 200 or fewer." };
  }

  let deleted = 0;
  let skipped = 0;

  for (const id of ids) {
    const existing = await prisma.member.findFirst({
      where: { id, gymId: user.gymId, deletedAt: null },
    });
    if (!existing) {
      skipped++;
      continue;
    }
    try {
      await prisma.member.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await audit({
        gymId: user.gymId,
        userId: user.id,
        action: "SOFT_DELETE",
        entityType: "Member",
        entityId: id,
        oldValue: { fullName: existing.fullName, memberCode: existing.memberCode },
        metadata: { event: "bulk_delete" },
      });
      deleted++;
    } catch {
      skipped++;
    }
  }

  revalidatePath("/members");
  return { ok: true, data: { deleted, skipped } };
}

/**
 * Returns CSV text for the requested members. Returns the string rather than
 * triggering a download — the client handles the blob/anchor dance so the
 * filename and timestamps stay user-local.
 */
export async function bulkExportMembersAction(
  ids: string[],
): Promise<ActionResult<{ csv: string; count: number }>> {
  const session = await requirePermission("members:read");
  const { user } = session;

  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "Nothing selected." };
  }
  if (ids.length > 1000) {
    return { ok: false, error: "Too many at once — export 1000 or fewer." };
  }

  const members = await prisma.member.findMany({
    where: { id: { in: ids }, gymId: user.gymId, deletedAt: null },
    orderBy: { joiningDate: "desc" },
    select: {
      memberCode: true,
      fullName: true,
      phone: true,
      email: true,
      gender: true,
      dateOfBirth: true,
      joiningDate: true,
      status: true,
      address: true,
      assignedTrainer: { select: { name: true } },
    },
  });

  // Build CSV with the same minimal escape rules used elsewhere
  const headers = [
    "Member Code",
    "Full Name",
    "Phone",
    "Email",
    "Gender",
    "Date of Birth",
    "Joining Date",
    "Status",
    "Address",
    "Trainer",
  ];

  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const fmt = (d: Date | null) =>
    d ? d.toISOString().slice(0, 10) : "";

  const rows = members.map((m) => [
    m.memberCode,
    m.fullName,
    m.phone,
    m.email ?? "",
    m.gender ?? "",
    fmt(m.dateOfBirth),
    fmt(m.joiningDate),
    m.status,
    m.address ?? "",
    m.assignedTrainer?.name ?? "",
  ]);

  const csv =
    headers.map(escape).join(",") +
    "\n" +
    rows.map((r) => r.map(escape).join(",")).join("\n");

  await audit({
    gymId: user.gymId,
    userId: user.id,
    action: "EXPORT",
    entityType: "Member",
    metadata: { count: members.length, source: "bulk_export" },
  });

  return { ok: true, data: { csv, count: members.length } };
}

/** Restore a soft-deleted member (powers the toast "Undo" link) */
export async function restoreMemberAction(id: string): Promise<ActionResult> {
  const session = await requirePermission("members:delete");
  const { user } = session;

  const existing = await prisma.member.findFirst({
    where: { id, gymId: user.gymId, deletedAt: { not: null } },
  });
  if (!existing) return { ok: false, error: "Member not found or already restored." };

  try {
    await prisma.member.update({
      where: { id },
      data: { deletedAt: null },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "RESTORE",
      entityType: "Member",
      entityId: id,
      newValue: { fullName: existing.fullName },
    });

    revalidatePath("/members");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
