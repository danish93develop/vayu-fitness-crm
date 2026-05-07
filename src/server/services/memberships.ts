import { prisma } from "@/lib/prisma";
import type { Prisma, MembershipStatus } from "@prisma/client";

export type MembershipListFilters = {
  search?: string;
  status?: MembershipStatus | "ALL";
  planId?: string;
  page?: number;
  pageSize?: number;
};

export async function listMemberships(gymId: string, filters: MembershipListFilters = {}) {
  const { search = "", status = "ALL", planId, page = 1, pageSize = 20 } = filters;

  const where: Prisma.MemberMembershipWhereInput = {
    gymId,
    deletedAt: null,
    ...(status !== "ALL" && { status }),
    ...(planId && { planId }),
    ...(search && {
      OR: [
        { membershipCode: { contains: search, mode: "insensitive" } },
        { member: { fullName: { contains: search, mode: "insensitive" } } },
        { member: { phone: { contains: search } } },
        { member: { memberCode: { contains: search, mode: "insensitive" } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.memberMembership.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        member: { select: { id: true, fullName: true, memberCode: true, phone: true } },
        plan: { select: { id: true, name: true, type: true, durationValue: true, durationUnit: true } },
      },
    }),
    prisma.memberMembership.count({ where }),
  ]);

  return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export async function getMembershipById(gymId: string, id: string) {
  return prisma.memberMembership.findFirst({
    where: { id, gymId, deletedAt: null },
    include: {
      member: {
        select: { id: true, fullName: true, memberCode: true, phone: true, email: true, status: true },
      },
      plan: true,
      freezes: { orderBy: { createdAt: "desc" }, include: { approvedBy: { select: { name: true } } } },
      payments: { orderBy: { paymentDate: "desc" } },
      createdBy: { select: { name: true } },
    },
  });
}

/**
 * Generate the next membership code (VF-MS-XXXX).
 * Same approach as members: max + 1, never reuse.
 */
export async function nextMembershipCode(gymId: string): Promise<string> {
  const last = await prisma.memberMembership.findFirst({
    where: { gymId, membershipCode: { startsWith: "VF-MS-" } },
    orderBy: { membershipCode: "desc" },
    select: { membershipCode: true },
  });
  const num = last ? parseInt(last.membershipCode.slice(6), 10) + 1 : 1;
  return `VF-MS-${String(num).padStart(4, "0")}`;
}
