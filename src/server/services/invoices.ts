import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type InvoiceListFilters = {
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
};

export async function listInvoices(gymId: string, filters: InvoiceListFilters = {}) {
  const { search = "", fromDate, toDate, page = 1, pageSize = 20 } = filters;

  const where: Prisma.InvoiceWhereInput = {
    gymId,
    ...(search && {
      OR: [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { memberNameSnapshot: { contains: search, mode: "insensitive" } },
        { memberPhoneSnapshot: { contains: search } },
      ],
    }),
    ...(fromDate || toDate
      ? {
          issueDate: {
            ...(fromDate && { gte: new Date(fromDate) }),
            ...(toDate && { lte: new Date(toDate) }),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { issueDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        member: { select: { id: true, fullName: true } },
        payment: { select: { paymentCode: true, mode: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export async function getInvoiceById(gymId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { id, gymId },
    include: {
      member: { select: { id: true, fullName: true, memberCode: true } },
      payment: { select: { paymentCode: true, mode: true, reference: true, paymentDate: true } },
    },
  });
}
