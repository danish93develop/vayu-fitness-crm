"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import type { MemberStatus, LeadStatus, PaymentStatus } from "@prisma/client";

export type SearchResult = {
  members: Array<{
    id: string;
    fullName: string;
    memberCode: string;
    phone: string;
    status: MemberStatus;
  }>;
  leads: Array<{
    id: string;
    name: string;
    phone: string;
    status: LeadStatus;
  }>;
  payments: Array<{
    id: string;
    paymentCode: string;
    memberName: string;
    totalPaise: number;
    status: PaymentStatus;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    memberName: string;
    totalPaise: number;
  }>;
  totalMatches: number;
};

const EMPTY: SearchResult = {
  members: [],
  leads: [],
  payments: [],
  invoices: [],
  totalMatches: 0,
};

export async function globalSearchAction(query: string): Promise<SearchResult> {
  const session = await requireAuth();
  const q = query.trim();

  if (q.length < 2) return EMPTY;

  const gymId = session.user.gymId;

  const [members, leads, payments, invoices] = await Promise.all([
    prisma.member.findMany({
      where: {
        gymId,
        deletedAt: null,
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { memberCode: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { fullName: "asc" },
      take: 5,
      select: {
        id: true,
        fullName: true,
        memberCode: true,
        phone: true,
        status: true,
      },
    }),
    prisma.lead.findMany({
      where: {
        gymId,
        deletedAt: null,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, phone: true, status: true },
    }),
    prisma.payment.findMany({
      where: {
        gymId,
        OR: [
          { paymentCode: { contains: q, mode: "insensitive" } },
          { reference: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { paymentDate: "desc" },
      take: 5,
      select: {
        id: true,
        paymentCode: true,
        totalPaise: true,
        status: true,
        member: { select: { fullName: true } },
      },
    }),
    prisma.invoice.findMany({
      where: {
        gymId,
        invoiceNumber: { contains: q, mode: "insensitive" },
      },
      orderBy: { issueDate: "desc" },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        totalPaise: true,
        memberNameSnapshot: true,
      },
    }),
  ]);

  return {
    members,
    leads,
    payments: payments.map((p) => ({
      id: p.id,
      paymentCode: p.paymentCode,
      memberName: p.member.fullName,
      totalPaise: p.totalPaise,
      status: p.status,
    })),
    invoices: invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      memberName: i.memberNameSnapshot,
      totalPaise: i.totalPaise,
    })),
    totalMatches: members.length + leads.length + payments.length + invoices.length,
  };
}
