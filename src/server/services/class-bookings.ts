import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Booking aggregate for a class — the seats math the UI cares about.
 * Only `BOOKED` status counts toward capacity. `WAITLIST` rows still get
 * shown so staff can see the queue, but they're not in the headcount.
 */
export async function getClassBookings(gymId: string, classId: string) {
  // Confirm the class belongs to the gym before returning anything
  const cls = await prisma.class.findFirst({
    where: { id: classId, gymId, deletedAt: null },
    include: {
      trainer: { select: { id: true, name: true, specialization: true } },
    },
  });
  if (!cls) return null;

  const bookings = await prisma.classBooking.findMany({
    where: { classId },
    orderBy: { bookedAt: "asc" },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          memberCode: true,
          phone: true,
          profilePhotoUrl: true,
          status: true,
        },
      },
      bookedBy: { select: { id: true, name: true } },
    },
  });

  const bookedCount = bookings.filter((b) => b.status === "BOOKED").length;
  const seatsLeft = Math.max(0, cls.capacity - bookedCount);

  return {
    cls,
    bookings,
    bookedCount,
    seatsLeft,
  };
}

/**
 * Search for members eligible to be added to a class. Excludes anyone who
 * already has an active booking row for the class (so the picker doesn't
 * surface duplicates).
 */
export async function searchEligibleMembers(
  gymId: string,
  classId: string,
  search: string,
  take = 8,
) {
  const trimmed = search.trim();
  if (!trimmed) return [];

  const existing = await prisma.classBooking.findMany({
    where: { classId, status: { in: ["BOOKED", "WAITLIST"] } },
    select: { memberId: true },
  });
  const excludeIds = existing.map((b) => b.memberId);

  const where: Prisma.MemberWhereInput = {
    gymId,
    deletedAt: null,
    id: { notIn: excludeIds },
    OR: [
      { fullName: { contains: trimmed, mode: "insensitive" } },
      { phone: { contains: trimmed } },
      { memberCode: { contains: trimmed, mode: "insensitive" } },
    ],
  };

  return prisma.member.findMany({
    where,
    take,
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      memberCode: true,
      phone: true,
      status: true,
      profilePhotoUrl: true,
    },
  });
}
