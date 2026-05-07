import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowRight, Bell, CalendarX, Snowflake } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserRoleType } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { can, type Permission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

type Alerts = Awaited<ReturnType<typeof import("@/server/services/dashboard").getAlerts>>;

type AlertItem = {
  show: boolean;
  /** Permission a viewer needs to be relevant for this alert. If they can't act, hide it. */
  permission: Permission;
  icon: LucideIcon;
  title: string;
  description: string;
  count: number;
  href: string;
  tone: "danger" | "warn" | "muted";
};

export function AlertsPanel({ alerts, role }: { alerts: Alerts; role: UserRoleType }) {
  const items: AlertItem[] = [
    {
      show: alerts.overdueInstallments > 0,
      permission: "payments:read",
      icon: AlertCircle,
      title: "Overdue installments",
      description: "Members with installments past due date",
      count: alerts.overdueInstallments,
      href: "/reports/installments",
      tone: "danger",
    },
    {
      show: alerts.expiredCount > 0,
      permission: "memberships:read",
      icon: CalendarX,
      title: "Expired memberships",
      description: "Members whose access has lapsed",
      count: alerts.expiredCount,
      href: "/memberships?status=EXPIRED",
      tone: "danger",
    },
    {
      show: alerts.pendingFreezes > 0,
      permission: "memberships:freeze:approve",
      icon: Snowflake,
      title: "Pending freeze requests",
      description: "Awaiting your approval",
      count: alerts.pendingFreezes,
      href: "/memberships/freezes",
      tone: "warn",
    },
    {
      show: alerts.todaysFollowUps > 0,
      permission: "leads:read",
      icon: AlertTriangle,
      title: "Today's lead follow-ups",
      description: "Leads scheduled for today",
      count: alerts.todaysFollowUps,
      href: "/leads",
      tone: "warn",
    },
  ];

  const visible = items.filter((i) => i.show && can(role, i.permission));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Alerts
        </CardTitle>
        <CardDescription>
          {visible.length === 0 ? "All clear — nothing needs your attention." : `${visible.length} item${visible.length === 1 ? "" : "s"} need attention`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-sm text-muted-foreground">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Bell className="h-5 w-5" />
            </div>
            <p>You&apos;re all caught up.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {visible.map((item) => (
              <AlertRow key={item.title} {...item} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AlertRow({ icon: Icon, title, description, count, href, tone }: AlertItem) {
  const toneClass = {
    danger: "bg-destructive/10 text-destructive",
    warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    muted: "bg-muted text-muted-foreground",
  }[tone];

  return (
    <li>
      <Link
        href={href as never}
        className="group flex items-center gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:border-primary/30 hover:bg-muted/40"
      >
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", toneClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{title}</span>
            <Badge variant={tone === "danger" ? "destructive" : "warn"}>{count}</Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}
