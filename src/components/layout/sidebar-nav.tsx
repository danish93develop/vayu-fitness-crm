"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Package,
  CreditCard,
  Receipt,
  Calendar,
  Dumbbell,
  CalendarDays,
  BarChart3,
  Bell,
  UserCog,
  Settings,
  ScrollText,
  Snowflake,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import type { NavItem, NavIconName } from "@/constants/nav";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  members: Users,
  leads: UserPlus,
  plans: Package,
  memberships: Package,
  payments: CreditCard,
  invoices: Receipt,
  attendance: Calendar,
  trainers: Dumbbell,
  classes: CalendarDays,
  reports: BarChart3,
  notifications: Bell,
  users: UserCog,
  settings: Settings,
  audit: ScrollText,
  freezes: Snowflake,
};

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href as never}
                prefetch={true}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
                  active
                    ? "bg-white/[0.06] font-medium text-white"
                    : "text-sidebar-foreground/70 hover:bg-white/[0.04] hover:text-sidebar-foreground",
                )}
              >
                <NavLinkContent icon={Icon} label={item.label} active={active} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * `useLinkStatus` only works inside a `<Link>` child component (Next 15+).
 * It returns { pending: true } for THIS specific link while it's navigating
 * — perfect for showing a spinner that replaces the icon.
 */
function NavLinkContent({
  icon: Icon,
  label,
  active,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  const { pending } = useLinkStatus();

  return (
    <>
      {/* Gradient indicator bar on the left when active */}
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-gradient-primary"
        />
      )}

      {pending ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[hsl(84,81%,56%)]" />
      ) : (
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            active && "text-[hsl(84,81%,56%)]",
          )}
        />
      )}
      <span className={cn(pending && "opacity-70")}>{label}</span>
    </>
  );
}
