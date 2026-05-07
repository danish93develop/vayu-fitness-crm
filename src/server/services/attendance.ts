import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "@/lib/date";

export async function listAttendanceForDate(gymId: string, date: Date) {
  return prisma.attendance.findMany({
    where: {
      gymId,
      date: { gte: startOfDay(date), lte: endOfDay(date) },
    },
    orderBy: { firstInAt: "desc" },
    include: {
      member: {
        select: { id: true, fullName: true, memberCode: true, phone: true, status: true },
      },
      markedBy: { select: { name: true } },
    },
  });
}

export async function getAttendanceById(gymId: string, id: string) {
  return prisma.attendance.findFirst({
    where: { id, gymId },
    include: {
      member: { select: { id: true, fullName: true, memberCode: true } },
      markedBy: { select: { name: true } },
    },
  });
}

export async function getTodayAttendanceCount(gymId: string) {
  const today = new Date();
  return prisma.attendance.count({
    where: {
      gymId,
      date: { gte: startOfDay(today), lte: endOfDay(today) },
    },
  });
}
