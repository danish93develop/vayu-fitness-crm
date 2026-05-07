import { prisma } from "@/lib/prisma";
import type { Prisma, MemberStatus } from "@prisma/client";

export type MemberListFilters = {
  search?: string;
  status?: MemberStatus | "ALL";
  page?: number;
  pageSize?: number;
  sortBy?: "fullName" | "createdAt" | "joiningDate";
  sortDir?: "asc" | "desc";
};

export async function listMembers(gymId: string, filters: MemberListFilters = {}) {
  const {
    search = "",
    status = "ALL",
    page = 1,
    pageSize = 20,
    sortBy = "createdAt",
    sortDir = "desc",
  } = filters;

  const where: Prisma.MemberWhereInput = {
    gymId,
    deletedAt: null,
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { memberCode: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(status !== "ALL" && { status }),
  };

  const [items, total] = await Promise.all([
    prisma.member.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        assignedTrainer: { select: { name: true } },
      },
    }),
    prisma.member.count({ where }),
  ]);

  return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export async function getMemberById(gymId: string, id: string) {
  return prisma.member.findFirst({
    where: { id, gymId, deletedAt: null },
    include: {
      assignedTrainer: { select: { id: true, name: true, specialization: true } },
      createdBy: { select: { name: true } },
      memberships: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          plan: { select: { id: true, name: true, type: true, durationValue: true, durationUnit: true } },
        },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
        take: 10,
      },
      invoices: { orderBy: { issueDate: "desc" }, take: 10 },
      attendances: { orderBy: { date: "desc" }, take: 10 },
      freezes: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
}

/**
 * Generate the next member code (VF-M-XXXX) based on the highest existing code.
 * Soft-deleted members keep their code so we never reuse one.
 */
export async function nextMemberCode(gymId: string): Promise<string> {
  const last = await prisma.member.findFirst({
    where: { gymId, memberCode: { startsWith: "VF-M-" } },
    orderBy: { memberCode: "desc" },
    select: { memberCode: true },
  });
  const num = last ? parseInt(last.memberCode.slice(5), 10) + 1 : 1;
  return `VF-M-${String(num).padStart(4, "0")}`;
}
