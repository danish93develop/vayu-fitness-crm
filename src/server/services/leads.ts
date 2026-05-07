import { prisma } from "@/lib/prisma";
import type { Prisma, LeadStatus } from "@prisma/client";

export type LeadListFilters = {
  search?: string;
  status?: LeadStatus | "ALL";
  page?: number;
  pageSize?: number;
};

export async function listLeads(gymId: string, filters: LeadListFilters = {}) {
  const { search = "", status = "ALL", page = 1, pageSize = 20 } = filters;

  const where: Prisma.LeadWhereInput = {
    gymId,
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(status !== "ALL" && { status }),
  };

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        interestedPlan: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export async function getLeadById(gymId: string, id: string) {
  return prisma.lead.findFirst({
    where: { id, gymId, deletedAt: null },
    include: {
      interestedPlan: { select: { id: true, name: true, basePricePaise: true } },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      convertedMember: { select: { id: true, fullName: true, memberCode: true } },
      followUps: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });
}
