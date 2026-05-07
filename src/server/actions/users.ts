"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import { countSuperAdmins } from "@/server/services/users";
import {
  UserCreateSchema,
  UserUpdateSchema,
  ResetPasswordSchema,
  type UserCreateInput,
  type UserUpdateInput,
  type ResetPasswordInput,
} from "@/lib/validations/user";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ── Create ─────────────────────────────────────────────────────────────────
export async function createUserAction(
  values: UserCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requirePermission("users:create");
  const { user: actor } = session;

  const parsed = UserCreateSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  // Email uniqueness
  const existing = await prisma.user.findUnique({ where: { email: v.email } });
  if (existing) return { ok: false, error: "A user with this email already exists." };

  // Default branch
  const branch = await prisma.branch.findFirst({
    where: { gymId: actor.gymId, deletedAt: null, isDefault: true },
  });
  if (!branch) return { ok: false, error: "No default branch configured." };

  try {
    const passwordHash = await hashPassword(v.password);
    const created = await prisma.user.create({
      data: {
        gymId: actor.gymId,
        branchId: branch.id,
        name: v.name.trim(),
        email: v.email,
        phone: v.phone?.trim() || null,
        role: v.role,
        passwordHash,
        isActive: v.isActive,
      },
    });

    await audit({
      gymId: actor.gymId,
      userId: actor.id,
      action: "CREATE",
      entityType: "User",
      entityId: created.id,
      newValue: { name: created.name, email: created.email, role: created.role },
    });

    revalidatePath("/users");
    return { ok: true, data: { id: created.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ── Update ─────────────────────────────────────────────────────────────────
export async function updateUserAction(
  id: string,
  values: UserUpdateInput,
): Promise<ActionResult> {
  const session = await requirePermission("users:update");
  const { user: actor } = session;

  const parsed = UserUpdateSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { id, gymId: actor.gymId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "User not found." };

  // Self-protection: can't change your own role or deactivate yourself
  if (existing.id === actor.id) {
    if (v.role !== existing.role) {
      return { ok: false, error: "You can't change your own role." };
    }
    if (!v.isActive) {
      return { ok: false, error: "You can't deactivate your own account." };
    }
  }

  // Last super admin protection
  if (existing.role === "SUPER_ADMIN" && (v.role !== "SUPER_ADMIN" || !v.isActive)) {
    const count = await countSuperAdmins(actor.gymId);
    if (count <= 1) {
      return {
        ok: false,
        error: "Cannot demote or deactivate the last Super Admin. Promote someone else first.",
      };
    }
  }

  // Email uniqueness if changing
  if (v.email !== existing.email) {
    const dup = await prisma.user.findFirst({
      where: { email: v.email, id: { not: id } },
    });
    if (dup) return { ok: false, error: "A user with this email already exists." };
  }

  try {
    const data: Record<string, unknown> = {
      name: v.name.trim(),
      email: v.email,
      phone: v.phone?.trim() || null,
      role: v.role,
      isActive: v.isActive,
    };
    if (v.password) {
      data.passwordHash = await hashPassword(v.password);
    }

    await prisma.user.update({ where: { id }, data });

    await audit({
      gymId: actor.gymId,
      userId: actor.id,
      action: existing.role !== v.role ? "ROLE_CHANGED" : "UPDATE",
      entityType: "User",
      entityId: id,
      oldValue: { role: existing.role, isActive: existing.isActive, email: existing.email },
      newValue: { role: v.role, isActive: v.isActive, email: v.email },
      metadata: v.password ? { passwordChanged: true } : undefined,
    });

    revalidatePath("/users");
    revalidatePath(`/users/${id}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ── Reset password (admin-driven) ──────────────────────────────────────────
export async function resetUserPasswordAction(
  id: string,
  values: ResetPasswordInput,
): Promise<ActionResult> {
  const { user: actor } = await requirePermission("users:update");

  const parsed = ResetPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const target = await prisma.user.findFirst({
    where: { id, gymId: actor.gymId, deletedAt: null },
  });
  if (!target) return { ok: false, error: "User not found." };

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        // Reset lockout when password is reset
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await audit({
      gymId: actor.gymId,
      userId: actor.id,
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: id,
      metadata: { byAdmin: actor.id },
    });

    revalidatePath("/users");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ── Unlock account (clear lockout) ─────────────────────────────────────────
export async function unlockUserAction(id: string): Promise<ActionResult> {
  const { user: actor } = await requirePermission("users:update");

  const target = await prisma.user.findFirst({
    where: { id, gymId: actor.gymId, deletedAt: null },
  });
  if (!target) return { ok: false, error: "User not found." };

  try {
    await prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    await audit({
      gymId: actor.gymId,
      userId: actor.id,
      action: "UPDATE",
      entityType: "User",
      entityId: id,
      metadata: { unlocked: true },
    });

    revalidatePath("/users");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ── Soft delete ────────────────────────────────────────────────────────────
export async function deleteUserAction(id: string): Promise<ActionResult> {
  const { user: actor } = await requirePermission("users:delete");

  if (id === actor.id) {
    return { ok: false, error: "You can't delete your own account." };
  }

  const existing = await prisma.user.findFirst({
    where: { id, gymId: actor.gymId, deletedAt: null },
  });
  if (!existing) return { ok: false, error: "User not found." };

  if (existing.role === "SUPER_ADMIN") {
    const count = await countSuperAdmins(actor.gymId);
    if (count <= 1) {
      return { ok: false, error: "Cannot delete the last Super Admin." };
    }
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await audit({
      gymId: actor.gymId,
      userId: actor.id,
      action: "SOFT_DELETE",
      entityType: "User",
      entityId: id,
      oldValue: { name: existing.name, email: existing.email, role: existing.role },
    });

    revalidatePath("/users");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
