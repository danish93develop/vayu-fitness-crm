import { redirect } from "next/navigation";
import type { UserRoleType } from "@prisma/client";
import { auth } from "@/auth";
import { can, type Permission } from "./permissions";

/**
 * Server-side helpers for guarding pages and server actions.
 * Throws via redirect() to /login if unauthenticated.
 */

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireRole(roles: UserRoleType | UserRoleType[]) {
  const session = await requireAuth();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(session.user.role)) {
    redirect("/dashboard"); // forbidden — bounce home rather than 403 for now
  }
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireAuth();
  if (!can(session.user.role, permission)) {
    redirect("/dashboard");
  }
  return session;
}

/** Non-throwing variant — returns null when not logged in */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}
