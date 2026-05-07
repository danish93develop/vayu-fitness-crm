"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import {
  ClassBookingSchema,
  type ClassBookingInput,
} from "@/lib/validations/class-booking";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Book a member into a class. Capacity is enforced inside a transaction so
 * two simultaneous bookings can't race past the cap. If the (class, member)
 * row already exists in CANCELLED state, we re-activate it instead of trying
 * to insert a duplicate (the unique constraint would reject that).
 */
export async function bookClassAction(
  values: ClassBookingInput,
): Promise<ActionResult<{ id: string }>> {
  const { user } = await requirePermission("classes:book");

  const parsed = ClassBookingSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Tenant-scoped lookup so a user can't book into another gym's class
      const cls = await tx.class.findFirst({
        where: { id: v.classId, gymId: user.gymId, deletedAt: null },
        select: { id: true, capacity: true, status: true, name: true, date: true },
      });
      if (!cls) throw new Error("Class not found.");
      if (cls.status === "CANCELLED")
        throw new Error("This class has been cancelled.");
      if (cls.status === "COMPLETED")
        throw new Error("This class is already completed.");

      const member = await tx.member.findFirst({
        where: { id: v.memberId, gymId: user.gymId, deletedAt: null },
        select: { id: true, fullName: true, memberCode: true, status: true },
      });
      if (!member) throw new Error("Member not found.");
      if (member.status === "CANCELLED")
        throw new Error(`${member.fullName}'s membership is cancelled.`);

      // Count seats taken right now, inside the same transaction
      const bookedCount = await tx.classBooking.count({
        where: { classId: cls.id, status: "BOOKED" },
      });
      const seatsLeft = cls.capacity - bookedCount;
      if (seatsLeft <= 0) {
        throw new Error(`Class is full (${cls.capacity}/${cls.capacity}).`);
      }

      // Upsert: if a CANCELLED row exists for this (class, member), reuse it
      const existing = await tx.classBooking.findUnique({
        where: { classId_memberId: { classId: cls.id, memberId: member.id } },
      });
      if (existing) {
        if (existing.status === "BOOKED") {
          throw new Error(`${member.fullName} is already booked.`);
        }
        const updated = await tx.classBooking.update({
          where: { id: existing.id },
          data: {
            status: "BOOKED",
            bookedAt: new Date(),
            cancelledAt: null,
            cancelReason: null,
            bookedById: user.id,
            notes: v.notes?.trim() || null,
          },
        });
        return { id: updated.id, member, cls };
      }

      const created = await tx.classBooking.create({
        data: {
          classId: cls.id,
          memberId: member.id,
          status: "BOOKED",
          bookedById: user.id,
          notes: v.notes?.trim() || null,
        },
      });
      return { id: created.id, member, cls };
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "CREATE",
      entityType: "ClassBooking",
      entityId: result.id,
      newValue: {
        classId: result.cls.id,
        className: result.cls.name,
        memberId: result.member.id,
        memberCode: result.member.memberCode,
      },
    });

    revalidatePath(`/classes/${v.classId}`);
    revalidatePath("/classes");
    return { ok: true, data: { id: result.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Cancel a booking, freeing the seat. Audit-logged. */
export async function cancelBookingAction(
  bookingId: string,
  reason?: string,
): Promise<ActionResult> {
  const { user } = await requirePermission("classes:book");

  const existing = await prisma.classBooking.findFirst({
    where: { id: bookingId, class: { gymId: user.gymId } },
    include: { class: { select: { id: true, name: true } } },
  });
  if (!existing) return { ok: false, error: "Booking not found." };
  if (existing.status === "CANCELLED")
    return { ok: false, error: "Already cancelled." };

  try {
    await prisma.classBooking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason?.trim() || null,
      },
    });

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "DELETE",
      entityType: "ClassBooking",
      entityId: bookingId,
      oldValue: {
        classId: existing.classId,
        memberId: existing.memberId,
        status: existing.status,
      },
      metadata: { event: "booking_cancelled", reason: reason ?? null },
    });

    revalidatePath(`/classes/${existing.classId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Toggle a booking's `attended` flag. Used post-class to mark who showed up.
 * When ATTENDED is set we also flip status so it's surfaceable in reports.
 */
export async function markAttendanceAction(
  bookingId: string,
  attended: boolean,
): Promise<ActionResult> {
  const { user } = await requirePermission("classes:book");

  const existing = await prisma.classBooking.findFirst({
    where: { id: bookingId, class: { gymId: user.gymId } },
    select: { id: true, classId: true, status: true },
  });
  if (!existing) return { ok: false, error: "Booking not found." };

  await prisma.classBooking.update({
    where: { id: bookingId },
    data: {
      attended,
      // Don't override CANCELLED rows; only flip BOOKED ↔ ATTENDED/NO_SHOW
      status:
        existing.status === "CANCELLED"
          ? existing.status
          : attended
            ? "ATTENDED"
            : "BOOKED",
    },
  });

  revalidatePath(`/classes/${existing.classId}`);
  return { ok: true, data: undefined };
}
