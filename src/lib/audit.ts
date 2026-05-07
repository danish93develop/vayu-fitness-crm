import { prisma } from "@/lib/prisma";
import type { AuditAction, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

type AuditInput = {
  gymId?: string | null;
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Write an audit log entry. Never throws — audit failure must not break
 * the parent operation. Logs the error so we still see it in observability.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        gymId: input.gymId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        oldValue: input.oldValue,
        newValue: input.newValue,
        metadata: input.metadata,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, input }, "audit log write failed");
  }
}

/** Pull a best-effort client IP from a Web Request */
export function getClientIp(req: Request | null | undefined): string | null {
  if (!req) return null;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip") ?? null;
}

export function getUserAgent(req: Request | null | undefined): string | null {
  return req?.headers.get("user-agent") ?? null;
}
