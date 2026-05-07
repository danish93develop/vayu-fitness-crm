import { prisma } from "@/lib/prisma";
import type { Prisma, MemberStatus } from "@prisma/client";
import { startOfDay, endOfDay, lastNMonths } from "@/lib/date";

// ── Members report ────────────────────────────────────────────────────────
export async function reportMembers(
  gymId: string,
  filter: { status?: MemberStatus | "ALL" } = {},
) {
  const status = filter.status ?? "ALL";
  return prisma.member.findMany({
    where: {
      gymId,
      deletedAt: null,
      ...(status !== "ALL" && { status }),
    },
    orderBy: { fullName: "asc" },
    include: {
      memberships: {
        where: { deletedAt: null },
        orderBy: { endDate: "desc" },
        take: 1,
        include: { plan: { select: { name: true } } },
      },
      assignedTrainer: { select: { name: true } },
    },
  });
}

// ── Revenue report ───────────────────────────────────────────────────────
export async function reportRevenue(
  gymId: string,
  filters: {
    fromDate?: Date;
    toDate?: Date;
    planId?: string;
    receivedById?: string;
    mode?: string;
  } = {},
) {
  const where: Prisma.PaymentWhereInput = {
    gymId,
    status: { in: ["PAID", "PARTIAL"] },
    ...(filters.fromDate || filters.toDate
      ? {
          paymentDate: {
            ...(filters.fromDate && { gte: startOfDay(filters.fromDate) }),
            ...(filters.toDate && { lte: endOfDay(filters.toDate) }),
          },
        }
      : {}),
    ...(filters.planId && {
      membership: { planId: filters.planId },
    }),
    ...(filters.receivedById && { receivedById: filters.receivedById }),
    ...(filters.mode && {
      mode: filters.mode as Prisma.PaymentWhereInput["mode"],
    }),
  };

  const [payments, totalAgg, modeBreakdown] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      include: {
        member: { select: { fullName: true, memberCode: true } },
        membership: { select: { plan: { select: { name: true } } } },
      },
    }),
    prisma.payment.aggregate({
      where,
      _sum: { totalPaise: true, gstPaise: true, taxablePaise: true, discountPaise: true },
      _count: { _all: true },
    }),
    prisma.payment.groupBy({
      by: ["mode"],
      where,
      _sum: { totalPaise: true },
      _count: { _all: true },
    }),
  ]);

  // Trend: last 6 months for chart
  const months = lastNMonths(6);
  const trend = await Promise.all(
    months.map((m) =>
      prisma.payment.aggregate({
        where: {
          ...where,
          paymentDate: { gte: m.start, lte: m.end },
        },
        _sum: { totalPaise: true },
      }),
    ),
  );

  return {
    payments,
    summary: {
      totalPaise: totalAgg._sum.totalPaise ?? 0,
      gstPaise: totalAgg._sum.gstPaise ?? 0,
      taxablePaise: totalAgg._sum.taxablePaise ?? 0,
      discountPaise: totalAgg._sum.discountPaise ?? 0,
      count: totalAgg._count._all,
    },
    modeBreakdown: modeBreakdown.map((m) => ({
      mode: m.mode,
      totalPaise: m._sum.totalPaise ?? 0,
      count: m._count._all,
    })),
    trend: months.map((m, i) => ({ label: m.label, paise: trend[i]?._sum.totalPaise ?? 0 })),
  };
}

// ── Attendance report ────────────────────────────────────────────────────
export async function reportAttendance(
  gymId: string,
  range: { fromDate: Date; toDate: Date },
) {
  const where: Prisma.AttendanceWhereInput = {
    gymId,
    date: { gte: startOfDay(range.fromDate), lte: endOfDay(range.toDate) },
  };

  const [byMember, totalCount, daily] = await Promise.all([
    prisma.attendance.groupBy({
      by: ["memberId"],
      where,
      _count: { _all: true },
      orderBy: { _count: { memberId: "desc" } },
      take: 100,
    }),
    prisma.attendance.count({ where }),
    prisma.attendance.groupBy({
      by: ["date"],
      where,
      _count: { _all: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const memberIds = byMember.map((m) => m.memberId);
  const members = memberIds.length
    ? await prisma.member.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, fullName: true, memberCode: true, phone: true, status: true },
      })
    : [];
  const memberMap = new Map(members.map((m) => [m.id, m]));

  return {
    perMember: byMember.map((b) => {
      const m = memberMap.get(b.memberId);
      return {
        memberId: b.memberId,
        fullName: m?.fullName ?? "—",
        memberCode: m?.memberCode ?? "—",
        phone: m?.phone ?? "—",
        status: m?.status ?? "INACTIVE",
        count: b._count._all,
      };
    }),
    daily: daily.map((d) => ({ date: d.date, count: d._count._all })),
    totalCount,
  };
}

// ── Leads report (conversion funnel) ─────────────────────────────────────
export async function reportLeads(
  gymId: string,
  range: { fromDate?: Date; toDate?: Date } = {},
) {
  const where: Prisma.LeadWhereInput = {
    gymId,
    deletedAt: null,
    ...(range.fromDate || range.toDate
      ? {
          createdAt: {
            ...(range.fromDate && { gte: startOfDay(range.fromDate) }),
            ...(range.toDate && { lte: endOfDay(range.toDate) }),
          },
        }
      : {}),
  };

  const [byStatus, bySource, total, leads] = await Promise.all([
    prisma.lead.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["source"], where, _count: { _all: true } }),
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        interestedPlan: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    }),
  ]);

  const converted = byStatus.find((s) => s.status === "CONVERTED")?._count._all ?? 0;
  const lost = byStatus.find((s) => s.status === "LOST")?._count._all ?? 0;
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

  return {
    total,
    converted,
    lost,
    conversionRate,
    byStatus: byStatus.map((b) => ({ status: b.status, count: b._count._all })),
    bySource: bySource.map((b) => ({ source: b.source, count: b._count._all })),
    leads,
  };
}

// ── Installments due report ──────────────────────────────────────────────
export async function reportInstallments(gymId: string) {
  return prisma.paymentInstallment.findMany({
    where: {
      status: "PENDING",
      membership: { gymId, deletedAt: null },
    },
    orderBy: { dueDate: "asc" },
    include: {
      membership: {
        select: {
          membershipCode: true,
          member: { select: { id: true, fullName: true, memberCode: true, phone: true } },
          plan: { select: { name: true } },
        },
      },
    },
  });
}
