"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { startOfDay, endOfDay } from "@/lib/date";
import { CheckInSchema, EditAttendanceSchema, type CheckInInput, type EditAttendanceInput } from "@/lib/validations/attendance";
import type { MemberStatus } from "@prisma/client";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Fast member search for the check-in panel. Returns up to 8 matches with
 * their current status + a `blocked` flag if their membership doesn't allow
 * gym access. Marked async-safe (no mutations). Used by client component.
 */
export async function searchMembersForCheckInAction(
  query: string,
): Promise<
  ActionResult<
    Array<{
      id: string;
      fullName: string;
      memberCode: string;
      phone: string;
      status: MemberStatus;
      blocked: boolean;
      blockReason: string | null;
      alreadyCheckedInAt: Date | null;
    }>
  >
> {
  const { user } = await requirePermission("attendance:read");

  const q = query.trim();
  if (q.length < 2) return { ok: true, data: [] };

  const today = new Date();

  const members = await prisma.member.findMany({
    where: {
      gymId: user.gymId,
      deletedAt: null,
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { memberCode: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    },
    take: 8,
    orderBy: { fullName: "asc" },
    include: {
      attendances: {
        where: { date: { gte: startOfDay(today), lte: endOfDay(today) } },
        select: { firstInAt: true },
        take: 1,
      },
    },
  });

  return {
    ok: true,
    data: members.map((m) => {
      let blocked = false;
      let blockReason: string | null = null;
      switch (m.status) {
        case "EXPIRED":
          blocked = true;
          blockReason = "Membership expired — renew before check-in.";
          break;
        case "FROZEN":
          blocked = true;
          blockReason = "Membership is frozen — they shouldn't use the gym.";
          break;
        case "CANCELLED":
          blocked = true;
          blockReason = "Membership cancelled.";
          break;
        case "INACTIVE":
          blocked = true;
          blockReason = "Member is inactive.";
          break;
      }
      return {
        id: m.id,
        fullName: m.fullName,
        memberCode: m.memberCode,
        phone: m.phone,
        status: m.status,
        blocked,
        blockReason,
        alreadyCheckedInAt: m.attendances[0]?.firstInAt ?? null,
      };
    }),
  };
}

export async function checkInAction(
  values: CheckInInput,
): Promise<ActionResult<{ id: string; firstInAt: Date }>> {
  const { user } = await requirePermission("attendance:mark");

  const parsed = CheckInSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const member = await prisma.member.findFirst({
    where: { id: v.memberId, gymId: user.gymId, deletedAt: null },
    include: {
      attendances: {
        where: {
          date: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) },
        },
        select: { id: true, firstInAt: true },
        take: 1,
      },
    },
  });
  if (!member) return { ok: false, error: "Member not found." };

  // Block if status doesn't permit check-in
  if (["EXPIRED", "FROZEN", "CANCELLED", "INACTIVE"].includes(member.status)) {
    return {
      ok: false,
      error: `Cannot check in: member status is ${member.status.replace("_", " ").toLowerCase()}.`,
    };
  }

  // Already checked in today? Return the existing record (idempotent UX)
  if (member.attendances.length > 0) {
    const existing = member.attendances[0]!;
    return {
      ok: false,
      error: `${member.fullName} is already marked at ${existing.firstInAt
        ? new Date(existing.firstInAt).toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : "today"}.`,
    };
  }

  const now = new Date();

  try {
    const attendance = await prisma.attendance.create({
      data: {
        gymId: user.gymId,
        branchId: member.branchId,
        memberId: member.id,
        date: startOfDay(now),
        firstInAt: now,
        method: "MANUAL",
        markedById: user.id,
        notes: v.notes?.trim() || null,
      },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "CREATE",
      entityType: "Attendance",
      entityId: attendance.id,
      newValue: { memberId: member.id, firstInAt: now.toISOString() },
    });

    revalidatePath("/attendance");
    revalidatePath(`/members/${member.id}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { id: attendance.id, firstInAt: now } };
  } catch (err) {
    // Unique constraint on (memberId, date) → already marked
    return { ok: false, error: (err as Error).message };
  }
}

export async function editAttendanceAction(
  id: string,
  values: EditAttendanceInput,
): Promise<ActionResult> {
  const { user } = await requirePermission("attendance:edit");

  const parsed = EditAttendanceSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const existing = await prisma.attendance.findFirst({
    where: { id, gymId: user.gymId },
  });
  if (!existing) return { ok: false, error: "Attendance record not found." };

  // Combine the existing date with the new HH:MM time
  const [hh, mm] = v.time.split(":").map(Number) as [number, number];
  const newTime = new Date(existing.date);
  newTime.setHours(hh, mm, 0, 0);

  try {
    await prisma.attendance.update({
      where: { id },
      data: {
        firstInAt: newTime,
        notes: v.notes?.trim() || null,
      },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "ATTENDANCE_EDITED",
      entityType: "Attendance",
      entityId: id,
      oldValue: {
        firstInAt: existing.firstInAt?.toISOString() ?? null,
        notes: existing.notes,
      },
      newValue: { firstInAt: newTime.toISOString(), notes: v.notes },
    });

    revalidatePath("/attendance");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Mark check-out — sets lastOutAt to now. */
export async function checkOutAction(id: string): Promise<ActionResult> {
  const { user } = await requirePermission("attendance:mark");

  const existing = await prisma.attendance.findFirst({
    where: { id, gymId: user.gymId },
  });
  if (!existing) return { ok: false, error: "Attendance record not found." };
  if (existing.lastOutAt) {
    return { ok: false, error: "Already checked out." };
  }

  try {
    await prisma.attendance.update({
      where: { id },
      data: { lastOutAt: new Date() },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "ATTENDANCE_EDITED",
      entityType: "Attendance",
      entityId: id,
      metadata: { event: "check_out" },
    });

    revalidatePath("/attendance");
    revalidatePath(`/members/${existing.memberId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteAttendanceAction(id: string): Promise<ActionResult> {
  const { user } = await requirePermission("attendance:edit");

  const existing = await prisma.attendance.findFirst({
    where: { id, gymId: user.gymId },
  });
  if (!existing) return { ok: false, error: "Attendance record not found." };

  try {
    await prisma.attendance.delete({ where: { id } });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "DELETE",
      entityType: "Attendance",
      entityId: id,
      oldValue: {
        memberId: existing.memberId,
        firstInAt: existing.firstInAt?.toISOString() ?? null,
        date: existing.date.toISOString(),
      },
    });

    revalidatePath("/attendance");
    revalidatePath(`/members/${existing.memberId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
