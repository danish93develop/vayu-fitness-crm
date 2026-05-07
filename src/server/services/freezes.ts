import { prisma } from "@/lib/prisma";
import type { Prisma, FreezeStatus } from "@prisma/client";

export async function listFreezes(
  gymId: string,
  filters: { status?: FreezeStatus | "ALL"; page?: number; pageSize?: number } = {},
) {
  const { status = "ALL", page = 1, pageSize = 20 } = filters;

  const where: Prisma.MembershipFreezeWhereInput = {
    gymId,
    ...(status !== "ALL" && { status }),
  };

  const [items, total] = await Promise.all([
    prisma.membershipFreeze.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        member: { select: { id: true, fullName: true, memberCode: true } },
        membership: { select: { id: true, plan: { select: { name: true } }, endDate: true } },
        approvedBy: { select: { name: true } },
        requestedBy: { select: { name: true } },
      },
    }),
    prisma.membershipFreeze.count({ where }),
  ]);

  return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export async function getFreezeStats(gymId: string) {
  const [pending, active] = await Promise.all([
    prisma.membershipFreeze.count({ where: { gymId, status: "PENDING" } }),
    prisma.membershipFreeze.count({ where: { gymId, status: "APPROVED" } }),
  ]);
  return { pending, active };
}
