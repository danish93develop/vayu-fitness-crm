import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "./empty-state";
import { AvatarCell } from "@/components/tables/avatar-cell";
import { formatPaiseShort } from "@/lib/money";
import { daysFromNow, formatDate } from "@/lib/date";
import { Banknote } from "lucide-react";

type Installment = Awaited<ReturnType<typeof import("@/server/services/dashboard").getInstallmentDues>>[number];

export function InstallmentDues({ installments }: { installments: Installment[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Installment dues</CardTitle>
        <CardDescription>Pending in the next 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {installments.length === 0 ? (
          <EmptyState icon={Banknote} message="No installments due." />
        ) : (
          <ul className="divide-y divide-border">
            {installments.map((i) => {
              const days = daysFromNow(i.dueDate);
              const overdue = days < 0;
              return (
                <li key={i.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <AvatarCell
                      name={i.membership.member.fullName}
                      seed={i.membership.member.memberCode}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {i.membership.member.fullName}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        Installment {i.installmentNumber} · {i.membership.plan.name} · due{" "}
                        {formatDate(i.dueDate)}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <div className="text-sm font-semibold tabular-nums">
                      {formatPaiseShort(i.amountPaise)}
                    </div>
                    <div
                      className={`text-xs ${overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}
                    >
                      {overdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
                    </div>
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
