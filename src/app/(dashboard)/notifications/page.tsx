import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  CalendarX,
  Snowflake,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { requireAuth } from "@/lib/auth/session";
import { getAlerts } from "@/server/services/dashboard";
import { syncMembershipStatuses } from "@/server/services/membership-status";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

type Item = {
  icon: LucideIcon;
  title: string;
  description: string;
  count: number;
  href: string;
  tone: "danger" | "warn" | "muted";
  category: "Critical" | "Action needed";
};

export default async function NotificationsPage() {
  const session = await requireAuth();
  await syncMembershipStatuses();

  const alerts = await getAlerts(session.user.gymId, session.user.id);

  const items: Item[] = [];
  if (alerts.expiredCount > 0) {
    items.push({
      icon: CalendarX,
      title: "Expired memberships",
      description: `${alerts.expiredCount} member${alerts.expiredCount === 1 ? "" : "s"} need to renew. Reach out so they don't churn.`,
      count: alerts.expiredCount,
      href: "/memberships?status=EXPIRED",
      tone: "danger",
      category: "Critical",
    });
  }
  if (alerts.overdueInstallments > 0) {
    items.push({
      icon: AlertCircle,
      title: "Overdue installments",
      description: `${alerts.overdueInstallments} installment${alerts.overdueInstallments === 1 ? "" : "s"} past due date. Call the members to collect payment.`,
      count: alerts.overdueInstallments,
      href: "/reports/installments",
      tone: "danger",
      category: "Critical",
    });
  }
  if (alerts.pendingFreezes > 0) {
    items.push({
      icon: Snowflake,
      title: "Freeze approvals waiting",
      description: `${alerts.pendingFreezes} freeze request${alerts.pendingFreezes === 1 ? "" : "s"} need admin/manager approval.`,
      count: alerts.pendingFreezes,
      href: "/memberships/freezes",
      tone: "warn",
      category: "Action needed",
    });
  }
  if (alerts.todaysFollowUps > 0) {
    items.push({
      icon: AlertTriangle,
      title: "Today's lead follow-ups",
      description: `${alerts.todaysFollowUps} lead${alerts.todaysFollowUps === 1 ? "" : "s"} scheduled for follow-up today.`,
      count: alerts.todaysFollowUps,
      href: "/leads",
      tone: "warn",
      category: "Action needed",
    });
  }

  const grouped: Record<string, Item[]> = {
    Critical: items.filter((i) => i.category === "Critical"),
    "Action needed": items.filter((i) => i.category === "Action needed"),
  };
  const totalCount = items.reduce((sum, i) => sum + i.count, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={
          totalCount === 0
            ? "All clear — nothing needs your attention right now."
            : `${totalCount} item${totalCount === 1 ? "" : "s"} need attention.`
        }
      />

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold">You&apos;re all caught up!</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Future notifications about expiring memberships, overdue installments, freeze
              requests, and lead follow-ups will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, list]) =>
            list.length === 0 ? null : (
              <section key={category}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {category}
                  <Badge variant="muted">{list.length}</Badge>
                </h2>
                <div className="space-y-2">
                  {list.map((item) => (
                    <NotificationCard key={item.title} {...item} />
                  ))}
                </div>
              </section>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function NotificationCard({
  icon: Icon,
  title,
  description,
  count,
  href,
  tone,
}: Item) {
  const toneClass = {
    danger: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    warn: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    muted: "bg-muted text-muted-foreground",
  }[tone];

  return (
    <Link
      href={href as never}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-glow-sm"
    >
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-lg", toneClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold">{title}</span>
          <Badge variant={tone === "danger" ? "destructive" : "warn"}>{count}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
