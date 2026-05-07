import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "./empty-state";
import { StatusBadge } from "./status-badge";
import { AvatarCell } from "@/components/tables/avatar-cell";
import { daysFromNow, formatDate } from "@/lib/date";
import { CalendarClock } from "lucide-react";

type Membership = Awaited<ReturnType<typeof import("@/server/services/dashboard").getUpcomingExpiries>>[number];

export function UpcomingExpiries({ memberships }: { memberships: Membership[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming expiries</CardTitle>
        <CardDescription>Memberships ending in the next 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {memberships.length === 0 ? (
          <EmptyState icon={CalendarClock} message="No memberships expiring soon." />
        ) : (
          <ul className="divide-y divide-border">
            {memberships.map((m) => {
              const days = daysFromNow(m.endDate);
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <AvatarCell
                      name={m.member.fullName}
                      seed={m.member.memberCode}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{m.member.fullName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.plan.name} · expires {formatDate(m.endDate)}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {days <= 0 ? "today" : `${days}d`}
                    </span>
                    <StatusBadge status={m.status} size="sm" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
