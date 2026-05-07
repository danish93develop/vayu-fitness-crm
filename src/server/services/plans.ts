import { prisma } from "@/lib/prisma";

export async function listPlans(gymId: string, includeInactive = true) {
  return prisma.membershipPlan.findMany({
    where: {
      gymId,
      deletedAt: null,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { memberships: { where: { deletedAt: null } } } },
    },
  });
}

export async function listActivePlans(gymId: string) {
  return prisma.membershipPlan.findMany({
    where: { gymId, deletedAt: null, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      durationValue: true,
      durationUnit: true,
      basePricePaise: true,
      allowsInstallments: true,
      maxInstallments: true,
    },
  });
}

export async function getPlanById(gymId: string, id: string) {
  return prisma.membershipPlan.findFirst({
    where: { id, gymId, deletedAt: null },
  });
}
