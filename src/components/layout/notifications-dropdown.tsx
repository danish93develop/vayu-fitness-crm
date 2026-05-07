"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  AlertCircle,
  AlertTriangle,
  CalendarX,
  Snowflake,
  CheckCircle2,
  IndianRupee,
  CheckCheck,
  BellOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import type { Notification, NotificationType } from "@prisma/client";
import { markAllReadAction, markReadAction } from "@/server/actions/notifications";
import { snoozeAlertAction } from "@/server/actions/snooze";
import type { AlertKey } from "@/server/services/snooze";
import { relativeTime } from "@/lib/date";
import { cn } from "@/lib/utils";

type Alerts = {
  overdueInstallments: number;
  todaysFollowUps: number;
  pendingFreezes: number;
  expiredCount: number;
  snoozed?: AlertKey[];
};

type AlertItem = {
  alertKey: AlertKey;
  icon: LucideIcon;
  title: string;
  description: string;
  count: number;
  href: string;
  tone: "danger" | "warn" | "muted";
};

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  MEMBERSHIP_EXPIRING: AlertTriangle,
  MEMBERSHIP_EXPIRED: CalendarX,
  INSTALLMENT_DUE: AlertCircle,
  INSTALLMENT_OVERDUE: AlertCircle,
  FREEZE_REQUEST: Snowflake,
  LEAD_FOLLOWUP: AlertTriangle,
  PAYMENT_RECEIVED: IndianRupee,
  SYSTEM: Bell,
};

const TYPE_TONE: Record<NotificationType, "danger" | "warn" | "muted" | "success"> = {
  MEMBERSHIP_EXPIRING: "warn",
  MEMBERSHIP_EXPIRED: "danger",
  INSTALLMENT_DUE: "warn",
  INSTALLMENT_OVERDUE: "danger",
  FREEZE_REQUEST: "warn",
  LEAD_FOLLOWUP: "warn",
  PAYMENT_RECEIVED: "success",
  SYSTEM: "muted",
};

export function NotificationsDropdown({
  alerts,
  notifications,
  unreadCount,
}: {
  alerts: Alerts;
  notifications: Notification[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const alertItems: AlertItem[] = [];
  if (alerts.expiredCount > 0)
    alertItems.push({
      alertKey: "expired",
      icon: CalendarX,
      title: "Expired memberships",
      description: `${alerts.expiredCount} member${alerts.expiredCount === 1 ? "" : "s"} need to renew`,
      count: alerts.expiredCount,
      href: "/memberships?status=EXPIRED",
      tone: "danger",
    });
  if (alerts.overdueInstallments > 0)
    alertItems.push({
      alertKey: "overdue",
      icon: AlertCircle,
      title: "Overdue installments",
      description: `${alerts.overdueInstallments} past due`,
      count: alerts.overdueInstallments,
      href: "/reports/installments",
      tone: "danger",
    });
  if (alerts.pendingFreezes > 0)
    alertItems.push({
      alertKey: "freezes",
      icon: Snowflake,
      title: "Freeze approvals",
      description: `${alerts.pendingFreezes} awaiting decision`,
      count: alerts.pendingFreezes,
      href: "/memberships/freezes",
      tone: "warn",
    });
  if (alerts.todaysFollowUps > 0)
    alertItems.push({
      alertKey: "followups",
      icon: AlertTriangle,
      title: "Follow-ups today",
      description: `${alerts.todaysFollowUps} scheduled`,
      count: alerts.todaysFollowUps,
      href: "/leads",
      tone: "warn",
    });

  const totalBadge = alertItems.length + unreadCount;

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllReadAction();
      toast.success("All notifications marked as read.");
      router.refresh();
    });
  }

  function handleNotificationClick(n: Notification) {
    startTransition(async () => {
      if (!n.readAt) {
        await markReadAction([n.id]);
      }
      setOpen(false);
      if (n.link) router.push(n.link as never);
      else router.refresh();
    });
  }

  function handleSnooze(alertKey: AlertKey) {
    startTransition(async () => {
      const result = await snoozeAlertAction(alertKey, 24);
      if (result.ok) {
        toast.success("Snoozed for 24 hours.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          open && "bg-muted text-foreground",
        )}
      >
        <Bell className="h-5 w-5" />
        {totalBadge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground ring-2 ring-card">
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Notifications</div>
              <div className="text-xs text-muted-foreground">
                {totalBadge === 0
                  ? "All clear"
                  : `${alertItems.length} alert${alertItems.length === 1 ? "" : "s"} · ${unreadCount} unread`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              )}
              <Link
                href={"/notifications" as never}
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-accent hover:underline"
              >
                View all
              </Link>
            </div>
          </div>

          <div className="max-h-[480px] overflow-y-auto">
            {/* Live alerts */}
            {alertItems.length > 0 && (
              <div>
                <div className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Active alerts
                </div>
                <ul className="divide-y divide-border">
                  {alertItems.map((item) => (
                    <AlertRow
                      key={item.title}
                      {...item}
                      onClick={() => setOpen(false)}
                      onSnooze={() => handleSnooze(item.alertKey)}
                    />
                  ))}
                </ul>
              </div>
            )}

            {/* DB notifications */}
            {notifications.length > 0 && (
              <div>
                <div className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent
                </div>
                <ul className="divide-y divide-border">
                  {notifications.map((n) => (
                    <NotifRow
                      key={n.id}
                      notif={n}
                      onClick={() => handleNotificationClick(n)}
                    />
                  ))}
                </ul>
              </div>
            )}

            {/* Empty state */}
            {totalBadge === 0 && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium">You&apos;re all caught up!</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  No alerts or notifications need your attention.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AlertRow({
  icon: Icon,
  title,
  description,
  count,
  href,
  tone,
  onClick,
  onSnooze,
}: AlertItem & { onClick: () => void; onSnooze: () => void }) {
  const toneClass = {
    danger: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    warn: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    muted: "bg-muted text-muted-foreground",
  }[tone];

  return (
    <li className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
      <Link
        href={href as never}
        onClick={onClick}
        className="flex flex-1 items-start gap-3 min-w-0"
      >
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            toneClass,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{title}</span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
              {count}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
        </div>
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSnooze();
        }}
        title="Snooze for 24 hours"
        className="ml-1 mt-0.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <BellOff className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

function NotifRow({ notif, onClick }: { notif: Notification; onClick: () => void }) {
  const Icon = TYPE_ICON[notif.type] ?? Bell;
  const tone = TYPE_TONE[notif.type] ?? "muted";
  const toneClass = {
    danger: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    warn: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    muted: "bg-muted text-muted-foreground",
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  }[tone];

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
          !notif.readAt && "bg-primary/5",
        )}
      >
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            toneClass,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{notif.title}</span>
            {!notif.readAt && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notif.message}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {relativeTime(notif.createdAt)}
          </p>
        </div>
      </button>
    </li>
  );
}
