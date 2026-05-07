import type { UserRoleType } from "@prisma/client";

/**
 * Nav config — keep this serializable. Icons are stored as string keys
 * because this file is read on the server (for role filtering) and the
 * resulting list is sent to a client component, which only accepts
 * plain JSON-able objects.
 *
 * The string keys are mapped to actual lucide-react components inside
 * `SidebarNav`.
 */

export type NavIconName =
  | "dashboard"
  | "members"
  | "leads"
  | "plans"
  | "memberships"
  | "payments"
  | "invoices"
  | "attendance"
  | "trainers"
  | "classes"
  | "reports"
  | "notifications"
  | "users"
  | "settings"
  | "audit"
  | "freezes";

export type NavItem = {
  label: string;
  href: string;
  icon: NavIconName;
  roles?: UserRoleType[]; // omitted = visible to all authenticated roles
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Members", href: "/members", icon: "members" },
  { label: "Leads", href: "/leads", icon: "leads" },
  { label: "Plans", href: "/plans", icon: "plans" },
  { label: "Memberships", href: "/memberships", icon: "memberships" },
  { label: "Freeze requests", href: "/memberships/freezes", icon: "freezes" },
  { label: "Payments", href: "/payments", icon: "payments" },
  { label: "Invoices", href: "/invoices", icon: "invoices" },
  { label: "Attendance", href: "/attendance", icon: "attendance" },
  { label: "Trainers", href: "/trainers", icon: "trainers" },
  { label: "Classes", href: "/classes", icon: "classes" },
  { label: "Reports", href: "/reports", icon: "reports" },
  { label: "Notifications", href: "/notifications", icon: "notifications" },
  { label: "Users", href: "/users", icon: "users", roles: ["SUPER_ADMIN", "ADMIN"] },
  { label: "Settings", href: "/settings", icon: "settings", roles: ["SUPER_ADMIN", "ADMIN"] },
  { label: "Audit Logs", href: "/audit-logs", icon: "audit", roles: ["SUPER_ADMIN", "ADMIN"] },
];
