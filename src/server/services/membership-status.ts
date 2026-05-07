import { prisma } from "@/lib/prisma";
import { addDays, startOfDay } from "@/lib/date";
import { BUSINESS_RULES } from "@/constants/business-rules";

/**
 * Sync membership + member statuses to reality based on dates and freezes.
 *
 *   • Approved freezes activating today        → freeze.status=ACTIVE,
 *                                                 membership.status=FROZEN,
 *                                                 member.status=FROZEN
 *   • Active freezes that have ended          → freeze.status=COMPLETED,
 *                                                 membership.status restored
 *   • Memberships past endDate (and not FROZEN/CANCELLED) → EXPIRED
 *   • Memberships within `expiringSoonDays` (and ACTIVE) → EXPIRING_SOON
 *
 * Throttled to run at most once per minute via a module-level timestamp.
 * For production with multiple servers we'd use a proper cron / job queue.
 */
const SYNC_THROTTLE_MS = 60 * 1000; // 1 minute
let lastSyncAt = 0;

export async function syncMembershipStatuses(force = false) {
  if (!force && Date.now() - lastSyncAt < SYNC_THROTTLE_MS) return;
  lastSyncAt = Date.now();
  return _syncMembershipStatuses();
}

async function _syncMembershipStatuses() {
  const today = startOfDay(new Date());
  const expiringThreshold = addDays(today, BUSINESS_RULES.membership.expiringSoonDays);

  // ── 1. Approved freezes whose start date has arrived → activate them
  const activatingFreezes = await prisma.membershipFreeze.findMany({
    where: {
      status: "APPROVED",
      startDate: { lte: today },
      endDate: { gte: today },
    },
    select: { id: true, membershipId: true, memberId: true },
  });
  for (const f of activatingFreezes) {
    await prisma.$transaction([
      prisma.membershipFreeze.update({ where: { id: f.id }, data: { status: "ACTIVE" } }),
      prisma.memberMembership.update({
        where: { id: f.membershipId },
        data: { status: "FROZEN" },
      }),
      prisma.member.update({ where: { id: f.memberId }, data: { status: "FROZEN" } }),
    ]);
  }

  // ── 2. Active freezes that have ended → complete them and unfreeze
  const endedFreezes = await prisma.membershipFreeze.findMany({
    where: {
      status: "ACTIVE",
      endDate: { lt: today },
    },
    select: { id: true, membershipId: true, memberId: true },
  });
  for (const f of endedFreezes) {
    await prisma.$transaction([
      prisma.membershipFreeze.update({ where: { id: f.id }, data: { status: "COMPLETED" } }),
      // Restore membership to ACTIVE — the next pass below will re-mark it
      // EXPIRING_SOON or EXPIRED if the dates require it
      prisma.memberMembership.update({
        where: { id: f.membershipId },
        data: { status: "ACTIVE" },
      }),
      prisma.member.update({ where: { id: f.memberId }, data: { status: "ACTIVE" } }),
    ]);
  }

  // ── 3. Memberships past end date → EXPIRED (skip FROZEN/CANCELLED)
  await prisma.memberMembership.updateMany({
    where: {
      endDate: { lt: today },
      status: { notIn: ["EXPIRED", "CANCELLED", "FROZEN"] },
      deletedAt: null,
    },
    data: { status: "EXPIRED" },
  });

  // ── 4. Memberships within expiry window → EXPIRING_SOON
  await prisma.memberMembership.updateMany({
    where: {
      endDate: { gte: today, lte: expiringThreshold },
      status: "ACTIVE",
      deletedAt: null,
    },
    data: { status: "EXPIRING_SOON" },
  });

  // ── 5. Sync Member.status from latest membership state
  const expiredMembers = await prisma.memberMembership.findMany({
    where: { status: "EXPIRED" },
    select: { memberId: true },
    distinct: ["memberId"],
  });
  for (const m of expiredMembers) {
    await prisma.member.updateMany({
      where: { id: m.memberId, status: { in: ["ACTIVE", "EXPIRING_SOON"] } },
      data: { status: "EXPIRED" },
    });
  }

  const expiringMembers = await prisma.memberMembership.findMany({
    where: { status: "EXPIRING_SOON" },
    select: { memberId: true },
    distinct: ["memberId"],
  });
  for (const m of expiringMembers) {
    await prisma.member.updateMany({
      where: { id: m.memberId, status: "ACTIVE" },
      data: { status: "EXPIRING_SOON" },
    });
  }
}
