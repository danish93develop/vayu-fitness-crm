import { prisma } from "@/lib/prisma";
import type { NotificationType, Prisma, UserRoleType } from "@prisma/client";
import { logger } from "@/lib/logger";
import { ADMIN_ROLES } from "@/lib/auth/permissions";

type CreateInput = {
  gymId: string;
  /** Targeted user (for personal notifications) */
  userId?: string | null;
  /** Or targeted role (broadcast to all users with that role) */
  targetRole?: UserRoleType | null;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Create a notification row. Best-effort — logs and swallows errors so
 * it can never break the parent operation (payment, freeze, etc.).
 */
export async function createNotification(input: CreateInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        gymId: input.gymId,
        userId: input.userId ?? null,
        targetRole: input.targetRole ?? null,
        title: input.title,
        message: input.message,
        type: input.type,
        link: input.link ?? null,
        metadata: input.metadata,
      },
    });
  } catch (err) {
    logger.error({ err, input }, "notification create failed");
  }
}

/**
 * Broadcast to every admin/super-admin user in the gym (for system-wide
 * events like freeze approvals waiting). Cheaper to write per-user rows
 * than to query targetRole=ADMIN at read time.
 */
export async function notifyAdmins(
  gymId: string,
  payload: Omit<CreateInput, "gymId" | "userId" | "targetRole">,
): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: {
        gymId,
        deletedAt: null,
        isActive: true,
        role: { in: ADMIN_ROLES },
      },
      select: { id: true },
    });
    await Promise.all(
      admins.map((a) =>
        createNotification({
          gymId,
          userId: a.id,
          ...payload,
        }),
      ),
    );
  } catch (err) {
    logger.error({ err, gymId }, "notifyAdmins failed");
  }
}

/** List unread + recent notifications for a user */
export async function listMyNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countUnread(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function markRead(userId: string, ids?: string[]) {
  return prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
      ...(ids && ids.length > 0 && { id: { in: ids } }),
    },
    data: { readAt: new Date() },
  });
}
