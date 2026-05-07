import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, addDays, lastNMonths } from "@/lib/date";
import { getActiveSnoozes, type AlertKey } from "./snooze";

/**
 * Single source for dashboard data. Wrapped in React's `cache()` so the
 * page can request the same slice multiple times within one render and
 * Prisma is queried once per slice per request.
 */

export const getStats = cache(async () => {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const next7Days = addDays(today, 7);
  const next14Days = addDays(today, 14);

  const [
    totalMembers,
    activeMembers,
    expiringSoon,
    expiredMembers,
    frozenMembers,
    pendingPayment,
    totalLeads,
    newLeads,
    convertedLeads,
    todayAttendance,
    monthRevenue,
    pendingPayments,
    upcomingInstallments,
    pendingFreezes,
  ] = await Promise.all([
    prisma.member.count({ where: { deletedAt: null } }),
    prisma.member.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.member.count({ where: { deletedAt: null, status: "EXPIRING_SOON" } }),
    prisma.member.count({ where: { deletedAt: null, status: "EXPIRED" } }),
    prisma.member.count({ where: { deletedAt: null, status: "FROZEN" } }),
    prisma.member.count({ where: { deletedAt: null, status: "PENDING_PAYMENT" } }),
    prisma.lead.count({ where: { deletedAt: null } }),
    prisma.lead.count({ where: { deletedAt: null, status: "NEW" } }),
    prisma.lead.count({ where: { deletedAt: null, status: "CONVERTED" } }),
    prisma.attendance.count({
      where: { date: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.payment.aggregate({
      where: {
        paymentDate: { gte: monthStart, lte: monthEnd },
        status: { in: ["PAID", "PARTIAL"] },
      },
      _sum: { totalPaise: true },
    }),
    prisma.payment.count({
      where: { status: { in: ["PENDING", "PARTIAL"] } },
    }),
    prisma.paymentInstallment.count({
      where: {
        status: "PENDING",
        dueDate: { lte: next14Days },
      },
    }),
    prisma.membershipFreeze.count({ where: { status: "PENDING" } }),
  ]);

  return {
    totalMembers,
    activeMembers,
    expiringSoon,
    expiredMembers,
    frozenMembers,
    pendingPayment,
    totalLeads,
    newLeads,
    convertedLeads,
    todayAttendance,
    monthRevenuePaise: monthRevenue._sum.totalPaise ?? 0,
    pendingPayments,
    upcomingInstallments,
    pendingFreezes,
    next7Days,
  };
});

export const getRevenueByMonth = cache(async (months = 6) => {
  const ranges = lastNMonths(months);
  const buckets = await Promise.all(
    ranges.map((r) =>
      prisma.payment.aggregate({
        where: {
          paymentDate: { gte: r.start, lte: r.end },
          status: { in: ["PAID", "PARTIAL"] },
        },
        _sum: { totalPaise: true },
      }),
    ),
  );
  return ranges.map((r, i) => ({
    label: r.label,
    paise: buckets[i]?._sum.totalPaise ?? 0,
  }));
});

export const getMemberStatusBreakdown = cache(async () => {
  const rows = await prisma.member.groupBy({
    by: ["status"],
    where: { deletedAt: null },
    _count: { _all: true },
  });
  return rows.map((r) => ({ status: r.status, count: r._count._all }));
});

export const getRecentPayments = cache(async (take = 5) => {
  return prisma.payment.findMany({
    where: { status: { in: ["PAID", "PARTIAL"] } },
    orderBy: { paymentDate: "desc" },
    take,
    select: {
      id: true,
      paymentCode: true,
      totalPaise: true,
      mode: true,
      paymentDate: true,
      member: { select: { fullName: true, memberCode: true } },
    },
  });
});

export const getRecentLeads = cache(async (take = 5) => {
  return prisma.lead.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      source: true,
      createdAt: true,
    },
  });
});

export const getUpcomingExpiries = cache(async (take = 5) => {
  const today = startOfDay(new Date());
  const next30 = addDays(today, 30);
  return prisma.memberMembership.findMany({
    where: {
      deletedAt: null,
      endDate: { gte: today, lte: next30 },
      status: { in: ["ACTIVE", "EXPIRING_SOON"] },
    },
    orderBy: { endDate: "asc" },
    take,
    select: {
      id: true,
      endDate: true,
      status: true,
      member: { select: { fullName: true, phone: true, memberCode: true } },
      plan: { select: { name: true } },
    },
  });
});

export const getInstallmentDues = cache(async (take = 5) => {
  const today = startOfDay(new Date());
  const next30 = addDays(today, 30);
  return prisma.paymentInstallment.findMany({
    where: {
      status: "PENDING",
      dueDate: { lte: next30 },
    },
    orderBy: { dueDate: "asc" },
    take,
    select: {
      id: true,
      installmentNumber: true,
      amountPaise: true,
      dueDate: true,
      membership: {
        select: {
          member: { select: { fullName: true, memberCode: true } },
          plan: { select: { name: true } },
        },
      },
    },
  });
});

export const getTodayActivity = cache(async () => {
  const today = new Date();
  const start = startOfDay(today);
  const end = endOfDay(today);

  const [salesAgg, paymentsCount, newMembers, newLeads, checkIns] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        paymentDate: { gte: start, lte: end },
        status: { in: ["PAID", "PARTIAL"] },
      },
      _sum: { totalPaise: true },
    }),
    prisma.payment.count({
      where: {
        paymentDate: { gte: start, lte: end },
        status: { in: ["PAID", "PARTIAL"] },
      },
    }),
    prisma.member.count({
      where: {
        deletedAt: null,
        createdAt: { gte: start, lte: end },
      },
    }),
    prisma.lead.count({
      where: {
        deletedAt: null,
        createdAt: { gte: start, lte: end },
      },
    }),
    prisma.attendance.count({
      where: {
        date: { gte: start, lte: end },
      },
    }),
  ]);

  return {
    salesPaise: salesAgg._sum.totalPaise ?? 0,
    paymentsCount,
    newMembers,
    newLeads,
    checkIns,
  };
});

export const getAlerts = cache(async (gymId?: string, userId?: string) => {
  const today = startOfDay(new Date());

  // Fetch raw counts and active snoozes in parallel
  const [overdueInstallments, todaysFollowUps, pendingFreezes, expiredCount, snoozed] =
    await Promise.all([
      prisma.paymentInstallment.count({
        where: { status: "PENDING", dueDate: { lt: today } },
      }),
      prisma.lead.count({
        where: {
          deletedAt: null,
          followUpDate: { gte: startOfDay(today), lte: endOfDay(today) },
          status: { notIn: ["CONVERTED", "LOST"] },
        },
      }),
      prisma.membershipFreeze.count({ where: { status: "PENDING" } }),
      prisma.member.count({ where: { deletedAt: null, status: "EXPIRED" } }),
      gymId && userId
        ? getActiveSnoozes(gymId, userId)
        : Promise.resolve(new Set<AlertKey>()),
    ]);

  // Snoozed alerts hide from the count but the underlying numbers are still
  // exposed so the UI can show "snoozed: 3 expired" if it wants to.
  return {
    overdueInstallments: snoozed.has("overdue") ? 0 : overdueInstallments,
    todaysFollowUps: snoozed.has("followups") ? 0 : todaysFollowUps,
    pendingFreezes: snoozed.has("freezes") ? 0 : pendingFreezes,
    expiredCount: snoozed.has("expired") ? 0 : expiredCount,
    snoozed: Array.from(snoozed),
  };
});
