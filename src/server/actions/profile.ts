"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { audit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  ProfileUpdateSchema,
  ChangePasswordSchema,
  type ProfileUpdateInput,
  type ChangePasswordInput,
} from "@/lib/validations/profile";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Update the signed-in user's own name + phone. Email/role are deliberately
 * excluded — those changes go through admin-managed flows so the audit trail
 * stays meaningful.
 */
export async function updateProfileAction(
  values: ProfileUpdateInput,
): Promise<ActionResult> {
  const session = await requireAuth();
  const parsed = ProfileUpdateSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, phone: true },
  });
  if (!before) return { ok: false, error: "Account not found." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
    },
  });

  await audit({
    gymId: session.user.gymId,
    userId: session.user.id,
    action: "UPDATE",
    entityType: "User",
    entityId: session.user.id,
    oldValue: { name: before.name, phone: before.phone },
    newValue: { name: parsed.data.name, phone: parsed.data.phone || null },
    metadata: { event: "self_profile_update" },
  });

  revalidatePath("/profile");
  return { ok: true, data: undefined };
}

/**
 * Change the signed-in user's password. Requires the current password — even
 * for an authenticated session — so that someone walking up to an unlocked
 * machine can't silently rotate credentials.
 */
export async function changeOwnPasswordAction(
  values: ChangePasswordInput,
): Promise<ActionResult> {
  const session = await requireAuth();

  // Throttle change attempts so a wrong-current-password loop can't be used
  // to brute-force the current password from an unlocked session.
  if (!checkRateLimit(`pwchange:${session.user.id}`, 8, 15 * 60 * 1000)) {
    return {
      ok: false,
      error: "Too many password change attempts. Try again in a few minutes.",
    };
  }

  const parsed = ChangePasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, gymId: true, passwordHash: true, isActive: true, deletedAt: true },
  });
  if (!user || !user.isActive || user.deletedAt || !user.passwordHash) {
    return { ok: false, error: "Account not found." };
  }

  const ok = await verifyPassword(user.passwordHash, parsed.data.currentPassword);
  if (!ok) {
    await audit({
      gymId: user.gymId,
      userId: user.id,
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: user.id,
      metadata: { event: "self_change_failed_wrong_current" },
    });
    return { ok: false, error: "Current password is incorrect." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await audit({
    gymId: user.gymId,
    userId: user.id,
    action: "PASSWORD_CHANGED",
    entityType: "User",
    entityId: user.id,
    metadata: { event: "self_change" },
  });

  return { ok: true, data: undefined };
}
