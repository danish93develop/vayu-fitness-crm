import { prisma } from "@/lib/prisma";
import type { Prisma, ClassStatus } from "@prisma/client";
import { startOfDay, endOfDay } from "@/lib/date";

export type ClassListFilters = {
  search?: string;
  status?: ClassStatus | "ALL";
  date?: Date; // exact date, optional
};

export async function listClasses(gymId: string, filters: ClassListFilters = {}) {
  const { search = "", status = "ALL", date } = filters;

  const where: Prisma.ClassWhereInput = {
    gymId,
    deletedAt: null,
    ...(status !== "ALL" && { status }),
    ...(date && {
      date: { gte: startOfDay(date), lte: endOfDay(date) },
    }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { trainer: { name: { contains: search, mode: "insensitive" } } },
      ],
    }),
  };

  const classes = await prisma.class.findMany({
    where,
    orderBy: [{ date: "desc" }, { startTime: "asc" }],
    include: {
      trainer: { select: { id: true, name: true } },
      _count: {
        select: {
          bookings: { where: { status: "BOOKED" } },
        },
      },
    },
  });

  return classes;
}

export async function getClassById(gymId: string, id: string) {
  return prisma.class.findFirst({
    where: { id, gymId, deletedAt: null },
    include: {
      trainer: { select: { id: true, name: true, specialization: true } },
    },
  });
}
