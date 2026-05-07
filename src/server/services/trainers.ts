import { prisma } from "@/lib/prisma";

export async function listTrainers(gymId: string) {
  return prisma.trainer.findMany({
    where: { gymId, deletedAt: null },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { assignedMembers: { where: { deletedAt: null } } } },
    },
  });
}

export async function getTrainerById(gymId: string, id: string) {
  return prisma.trainer.findFirst({
    where: { id, gymId, deletedAt: null },
  });
}

export async function listActiveTrainers(gymId: string) {
  return prisma.trainer.findMany({
    where: { gymId, deletedAt: null, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, specialization: true },
  });
}
