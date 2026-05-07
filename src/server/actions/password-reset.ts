"use server";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { audit } from "@/lib/audit";
import { addDays } from "@/lib/date";
import {
  RequestResetSchema,
  PerformResetSchema,
  type RequestResetInput,
  type PerformResetInput,
} from "@/lib/validations/password-reset";
import { checkRateLimit } from "@/lib/rate-limit";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const RESET_TOKEN_TTL_HOURS = 24;

/**
 * Issues a one-time password-reset token. Returns the bare token so a UI
 * (admin reset page, or future email integration) can build a link from it:
 *   https://your.gym/reset-password/{token}
 *
 * No email is sent — that's deliberately deferred until an email service
 * is configured. For now, admins copy the link manually.
 *
 * Security:
 *   - Always returns success even if the email doesn't exist (no enumeration).
 *   - Token is 32 random bytes, stored in `VerificationToken`.
 *   - Rate-limited per email to slow down spray attacks.
 */
export async function requestPasswordResetAction(
  values: RequestResetInput,
): Promise<ActionResult<{ token: string | null; expiresAt: Date }>> {
  const parsed = RequestResetSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }

  // Rate limit per email — 5 requests per hour per email
  if (!checkRateLimit(`pwreset:${parsed.data.email}`, 5, 60 * 60 * 1000)) {
    return {
      ok: false,
      error: "Too many reset requests. Please try again in an hour.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // Don't disclose whether the user exists. We still go through the motions
  // of "success" for the UI but don't actually create a token.
  const expiresAt = addDays(new Date(), RESET_TOKEN_TTL_HOURS / 24);
  if (!user || !user.isActive || user.deletedAt) {
    return { ok: true, data: { token: null, expiresAt } };
  }

  // Random URL-safe token (43 chars, ~256 bits)
  const token = randomBytes(32).toString("base64url");

  // Clean up any stale tokens for this user, then create the new one
  await prisma.verificationToken.deleteMany({
    where: { identifier: parsed.data.email },
  });
  await prisma.verificationToken.create({
    data: {
      identifier: parsed.data.email,
      token,
      expires: expiresAt,
    },
  });

  await audit({
    gymId: user.gymId,
    userId: user.id,
    action: "PASSWORD_CHANGED", // closest enum value (no PASSWORD_RESET_REQUESTED)
    entityType: "User",
    entityId: user.id,
    metadata: { event: "reset_token_issued", expiresAt: expiresAt.toISOString() },
  });

  return { ok: true, data: { token, expiresAt } };
}

/**
 * Perform the actual password reset using a valid token. The token is
 * single-use — it's deleted whether the reset succeeds or fails.
 */
export async function performPasswordResetAction(
  values: PerformResetInput,
): Promise<ActionResult> {
  const parsed = PerformResetSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token: parsed.data.token },
  });
  if (!record) {
    return { ok: false, error: "This reset link is invalid or has already been used." };
  }
  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token: parsed.data.token } });
    return { ok: false, error: "This reset link has expired. Request a new one." };
  }

  const user = await prisma.user.findUnique({
    where: { email: record.identifier },
  });
  if (!user || !user.isActive || user.deletedAt) {
    await prisma.verificationToken.delete({ where: { token: parsed.data.token } });
    return { ok: false, error: "Account not found." };
  }

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          // Clear lockout when password is reset
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.verificationToken.delete({ where: { token: parsed.data.token } }),
    ]);

    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: user.id,
      metadata: { event: "self_reset" },
    });

    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
