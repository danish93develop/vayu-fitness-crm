import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "./empty-state";
import { StatusBadge } from "./status-badge";
import { AvatarCell } from "@/components/tables/avatar-cell";
import { relativeTime } from "@/lib/date";
import { UserPlus } from "lucide-react";

type Lead = Awaited<ReturnType<typeof import("@/server/services/dashboard").getRecentLeads>>[number];

export function RecentLeads({ leads }: { leads: Lead[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent leads</CardTitle>
        <CardDescription>Latest enquiries</CardDescription>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <EmptyState icon={UserPlus} message="No leads yet." />
        ) : (
          <ul className="divide-y divide-border">
            {leads.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <AvatarCell name={l.name} seed={l.id} size="sm" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{l.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {l.phone} · {humanize(l.source)} · {relativeTime(l.createdAt)}
                    </div>
                  </div>
                </div>
                <StatusBadge status={l.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function humanize(s: string) {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
