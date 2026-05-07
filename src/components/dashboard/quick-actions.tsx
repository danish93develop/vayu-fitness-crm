"use client";

import Link from "next/link";
import { IndianRupee, UserPlus, CalendarCheck, CalendarDays } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserRoleType } from "@prisma/client";
import { can, type Permission } from "@/lib/auth/permissions";
import { QuickActionContent } from "./quick-action-content";
import { cn } from "@/lib/utils";

type Action = {
  key: string;
  permission: Permission;
  href: string;
  icon: LucideIcon;
  label: string;
  hint: string;
  tone: string;
};

const ALL_ACTIONS: Action[] = [
  {
    key: "payment",
    permission: "payments:create",
    href: "/payments/new",
    icon: IndianRupee,
    label: "Take payment",
    hint: "Record a payment + invoice",
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "checkin",
    permission: "attendance:mark",
    href: "/attendance",
    icon: CalendarCheck,
    label: "Check in member",
    hint: "Mark today's attendance",
    tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  {
    key: "member",
    permission: "members:create",
    href: "/members/new",
    icon: UserPlus,
    label: "Add member",
    hint: "Create a new member record",
    tone: "bg-lime-500/15 text-lime-700 dark:text-lime-300",
  },
  {
    key: "class",
    permission: "classes:create",
    href: "/classes/new",
    icon: CalendarDays,
    label: "Schedule class",
    hint: "Add to the class calendar",
    tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
];

export function QuickActions({ role }: { role: UserRoleType }) {
  const visible = ALL_ACTIONS.filter((a) => can(role, a.permission));

  if (visible.length === 0) return null;

  const cols =
    visible.length >= 4
      ? "lg:grid-cols-4"
      : visible.length === 3
        ? "lg:grid-cols-3"
        : visible.length === 2
          ? "lg:grid-cols-2"
          : "lg:grid-cols-1";

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", cols)}>
      {visible.map((a) => (
        <Link
          key={a.key}
          href={a.href as never}
          className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-glow-sm"
        >
          <QuickActionContent icon={a.icon} label={a.label} hint={a.hint} tone={a.tone} />
        </Link>
      ))}
    </div>
  );
}
