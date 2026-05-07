import { prisma } from "@/lib/prisma";
import type { Prisma, UserRoleType } from "@prisma/client";

export type UserListFilters = {
  search?: string;
  role?: UserRoleType | "ALL";
  status?: "ALL" | "ACTIVE" | "INACTIVE" | "LOCKED";
  page?: number;
  pageSize?: number;
};

export async function listUsers(gymId: string, filters: UserListFilters = {}) {
  const { search = "", role = "ALL", status = "ALL", page = 1, pageSize = 50 } = filters;

  const now = new Date();
  const where: Prisma.UserWhereInput = {
    gymId,
    deletedAt: null,
    role: { not: "MEMBER" }, // member self-service accounts (future) don't show here
    ...(role !== "ALL" && { role }),
    ...(status === "ACTIVE" && { isActive: true, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] }),
    ...(status === "INACTIVE" && { isActive: false }),
    ...(status === "LOCKED" && { lockedUntil: { gte: now } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        lastLoginIp: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export async function getUserById(gymId: string, id: string) {
  return prisma.user.findFirst({
    where: { id, gymId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      lastLoginIp: true,
      lockedUntil: true,
      failedLoginAttempts: true,
      createdAt: true,
    },
  });
}

export async function countSuperAdmins(gymId: string): Promise<number> {
  return prisma.user.count({
    where: { gymId, deletedAt: null, role: "SUPER_ADMIN", isActive: true },
  });
}
