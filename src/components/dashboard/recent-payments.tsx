import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "./empty-state";
import { AvatarCell } from "@/components/tables/avatar-cell";
import { formatPaiseShort } from "@/lib/money";
import { relativeTime } from "@/lib/date";
import { IndianRupee } from "lucide-react";

type Payment = Awaited<ReturnType<typeof import("@/server/services/dashboard").getRecentPayments>>[number];

export function RecentPayments({ payments }: { payments: Payment[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent payments</CardTitle>
        <CardDescription>Last {payments.length || 5} transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <EmptyState icon={IndianRupee} message="No payments yet." />
        ) : (
          <ul className="divide-y divide-border">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <AvatarCell name={p.member.fullName} seed={p.member.memberCode} size="sm" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.member.fullName}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      <span className="font-mono">{p.paymentCode}</span>
                      {" · "}
                      {p.mode}
                      {" · "}
                      {relativeTime(p.paymentDate)}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatPaiseShort(p.totalPaise)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
