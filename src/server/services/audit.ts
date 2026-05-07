import { prisma } from "@/lib/prisma";
import type { Prisma, AuditAction } from "@prisma/client";
import { startOfDay, endOfDay } from "@/lib/date";

export type AuditFilters = {
  entityType?: string;
  action?: AuditAction | "ALL";
  userId?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  pageSize?: number;
};

export async function listAuditLogs(gymId: string, filters: AuditFilters = {}) {
  const { entityType, action, userId, fromDate, toDate, page = 1, pageSize = 50 } = filters;

  const where: Prisma.AuditLogWhereInput = {
    gymId,
    ...(entityType && { entityType }),
    ...(action && action !== "ALL" && { action }),
    ...(userId && { userId }),
    ...(fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate && { gte: startOfDay(fromDate) }),
            ...(toDate && { lte: endOfDay(toDate) }),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

/** Distinct entity types currently in the audit log — used for the filter dropdown */
export async function listAuditEntityTypes(gymId: string): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({
    where: { gymId },
    distinct: ["entityType"],
    select: { entityType: true },
    orderBy: { entityType: "asc" },
  });
  return rows.map((r) => r.entityType);
}
