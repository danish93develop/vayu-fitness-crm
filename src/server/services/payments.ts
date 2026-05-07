import { prisma } from "@/lib/prisma";
import type { Prisma, PaymentStatus, PaymentMode } from "@prisma/client";

export type PaymentListFilters = {
  search?: string;
  status?: PaymentStatus | "ALL";
  mode?: PaymentMode | "ALL";
  page?: number;
  pageSize?: number;
};

export async function listPayments(gymId: string, filters: PaymentListFilters = {}) {
  const { search = "", status = "ALL", mode = "ALL", page = 1, pageSize = 20 } = filters;

  const where: Prisma.PaymentWhereInput = {
    gymId,
    ...(status !== "ALL" && { status }),
    ...(mode !== "ALL" && { mode }),
    ...(search && {
      OR: [
        { paymentCode: { contains: search, mode: "insensitive" } },
        { reference: { contains: search, mode: "insensitive" } },
        { member: { fullName: { contains: search, mode: "insensitive" } } },
        { member: { phone: { contains: search } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        member: { select: { id: true, fullName: true, memberCode: true } },
        membership: { select: { id: true, plan: { select: { name: true } } } },
        invoice: { select: { id: true, invoiceNumber: true } },
        receivedBy: { select: { name: true } },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export async function getPaymentById(gymId: string, id: string) {
  return prisma.payment.findFirst({
    where: { id, gymId },
    include: {
      member: { select: { id: true, fullName: true, memberCode: true, phone: true } },
      membership: {
        select: {
          id: true,
          membershipCode: true,
          plan: { select: { name: true } },
          finalPricePaise: true,
        },
      },
      invoice: true,
      installment: true,
      receivedBy: { select: { name: true } },
    },
  });
}

/** Sum what's already been paid towards a membership (excluding void/failed/refunded) */
export async function membershipPaidAmount(membershipId: string): Promise<number> {
  const result = await prisma.payment.aggregate({
    where: {
      membershipId,
      status: { in: ["PAID", "PARTIAL"] },
    },
    _sum: { totalPaise: true },
  });
  return result._sum.totalPaise ?? 0;
}
