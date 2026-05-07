import type { UserRoleType } from "@prisma/client";

/**
 * Single source of truth for role-based access.
 * Encodes the doc's role permission matrix:
 *
 *   - Only Admin/Super Admin can DELETE records
 *   - Receptionist cannot apply discounts directly
 *   - Trainer can only view assigned members
 *   - Manager can give limited discounts, approve freezes
 *   ...etc.
 */

/** All actions any role might perform. Add new ones as features ship. */
export type Permission =
  // Members
  | "members:read"
  | "members:create"
  | "members:update"
  | "members:delete"
  // Leads
  | "leads:read"
  | "leads:create"
  | "leads:update"
  | "leads:delete"
  | "leads:convert"
  // Plans
  | "plans:read"
  | "plans:create"
  | "plans:update"
  | "plans:delete"
  // Memberships
  | "memberships:read"
  | "memberships:create"
  | "memberships:update"
  | "memberships:freeze:request"
  | "memberships:freeze:approve"
  | "memberships:cancel"
  // Payments
  | "payments:read"
  | "payments:create"
  | "payments:void"
  | "payments:refund"
  | "payments:discount:any"
  | "payments:discount:limited"
  // Invoices
  | "invoices:read"
  | "invoices:create"
  // Attendance
  | "attendance:read"
  | "attendance:mark"
  | "attendance:edit"
  // Trainers
  | "trainers:read"
  | "trainers:create"
  | "trainers:update"
  | "trainers:delete"
  // Classes
  | "classes:read"
  | "classes:create"
  | "classes:update"
  | "classes:delete"
  | "classes:book"
  // Reports
  | "reports:read"
  | "reports:export"
  // Settings
  | "settings:read"
  | "settings:update"
  // Users / Roles
  | "users:read"
  | "users:create"
  | "users:update"
  | "users:delete"
  | "users:role:change"
  // Audit logs
  | "auditLogs:read";

const ALL: Permission[] = [
  "members:read", "members:create", "members:update", "members:delete",
  "leads:read", "leads:create", "leads:update", "leads:delete", "leads:convert",
  "plans:read", "plans:create", "plans:update", "plans:delete",
  "memberships:read", "memberships:create", "memberships:update", "memberships:freeze:request", "memberships:freeze:approve", "memberships:cancel",
  "payments:read", "payments:create", "payments:void", "payments:refund", "payments:discount:any", "payments:discount:limited",
  "invoices:read", "invoices:create",
  "attendance:read", "attendance:mark", "attendance:edit",
  "trainers:read", "trainers:create", "trainers:update", "trainers:delete",
  "classes:read", "classes:create", "classes:update", "classes:delete", "classes:book",
  "reports:read", "reports:export",
  "settings:read", "settings:update",
  "users:read", "users:create", "users:update", "users:delete", "users:role:change",
  "auditLogs:read",
];

/** Permission matrix per role. Mirrors the doc's role rules verbatim. */
const MATRIX: Record<UserRoleType, Permission[]> = {
  SUPER_ADMIN: ALL,

  ADMIN: ALL.filter(
    (p) =>
      // Admin gets nearly everything but not super-admin-only operations.
      // For MVP, ADMIN = SUPER_ADMIN. Tighten later (e.g. settings:update only super-admin).
      true,
  ),

  MANAGER: [
    "members:read", "members:create", "members:update",
    "leads:read", "leads:create", "leads:update", "leads:convert",
    "plans:read",
    "memberships:read", "memberships:create", "memberships:update", "memberships:freeze:approve",
    "payments:read", "payments:create", "payments:discount:limited",
    "invoices:read", "invoices:create",
    "attendance:read", "attendance:mark", "attendance:edit",
    "trainers:read",
    "classes:read", "classes:book",
    "reports:read",
  ],

  RECEPTIONIST: [
    "members:read", "members:create", "members:update",
    "leads:read", "leads:create", "leads:update",
    "plans:read",
    "memberships:read", "memberships:create",
    "payments:read", "payments:create", // no discount permission per spec
    "invoices:read", "invoices:create",
    "attendance:read", "attendance:mark",
    "trainers:read",
    "classes:read", "classes:book",
  ],

  ACCOUNTANT: [
    "members:read",
    "memberships:read",
    "payments:read", // view-only per spec
    "invoices:read",
    "reports:read", "reports:export",
  ],

  TRAINER: [
    "members:read",     // only assigned members — service layer will enforce row-level filter
    "attendance:read",
    "classes:read",
    "trainers:read",
  ],

  MEMBER: [
    // Reserved for future member self-service portal
    "members:read", // only own profile — enforced by service layer
    "attendance:read",
    "invoices:read",
    "memberships:read",
  ],
};

export function rolePermissions(role: UserRoleType): Permission[] {
  return MATRIX[role] ?? [];
}

export function can(role: UserRoleType, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function canAny(role: UserRoleType, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

export function canAll(role: UserRoleType, permissions: Permission[]): boolean {
  return permissions.every((p) => can(role, p));
}

/** Roles that can permanently DELETE records (not just soft-delete) */
export const DELETE_ROLES: UserRoleType[] = ["SUPER_ADMIN", "ADMIN"];

/** Roles allowed to access the admin-only sidebar items */
export const ADMIN_ROLES: UserRoleType[] = ["SUPER_ADMIN", "ADMIN"];
