import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { reportInstallments } from "@/server/services/reports";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/tables/data-table";
import { CsvDownloadButton } from "@/components/forms/csv-download-button";
import { formatDate, daysFromNow } from "@/lib/date";
import { formatPaiseShort } from "@/lib/money";

export const metadata = { title: "Installments report" };
export const dynamic = "force-dynamic";

export default async function InstallmentsReportPage() {
  const session = await requirePermission("reports:read");
  const installments = await reportInstallments(session.user.gymId);

  const overdue = installments.filter((i) => daysFromNow(i.dueDate) < 0).length;
  const dueSoon = installments.filter((i) => {
    const d = daysFromNow(i.dueDate);
    return d >= 0 && d <= 7;
  }).length;

  const csvHeaders = ["Member code", "Member", "Phone", "Plan", "Installment #", "Amount (₹)", "Due date", "Days from today"];
  const csvRows = installments.map((i) => [
    i.membership.member.memberCode,
    i.membership.member.fullName,
    i.membership.member.phone,
    i.membership.plan.name,
    i.installmentNumber,
    i.amountPaise / 100,
    formatDate(i.dueDate),
    daysFromNow(i.dueDate),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pending installments"
        description={`${installments.length} pending · ${overdue} overdue · ${dueSoon} due in next 7 days`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/reports"><ArrowLeft className="h-4 w-4" /> All reports</Link>
            </Button>
            <CsvDownloadButton
              filename={`vayu-installments-${new Date().toISOString().slice(0, 10)}`}
              headers={csvHeaders}
              rows={csvRows}
            />
          </>
        }
      />

      <DataTable
        rows={installments}
        rowKey={(i) => i.id}
        emptyMessage="No pending installments."
        columns={[
          {
            key: "member",
            header: "Member",
            cell: (i) => (
              <Link
                href={`/members/${i.membership.member.id}` as never}
                className="font-medium hover:underline"
              >
                {i.membership.member.fullName}
              </Link>
            ),
          },
          {
            key: "code",
            header: "Code",
            cell: (i) => <span className="font-mono text-xs text-muted-foreground">{i.membership.member.memberCode}</span>,
          },
          {
            key: "phone",
            header: "Phone",
            cell: (i) => <span className="text-xs text-muted-foreground">{i.membership.member.phone}</span>,
          },
          {
            key: "plan",
            header: "Plan",
            cell: (i) => <span className="text-sm">{i.membership.plan.name}</span>,
          },
          {
            key: "num",
            header: "#",
            cell: (i) => <Badge variant="outline">{i.installmentNumber} of 2</Badge>,
          },
          {
            key: "amount",
            header: "Amount",
            cell: (i) => <span className="font-semibold tabular-nums">{formatPaiseShort(i.amountPaise)}</span>,
          },
          {
            key: "due",
            header: "Due",
            cell: (i) => {
              const days = daysFromNow(i.dueDate);
              const overdue = days < 0;
              return (
                <div>
                  <div className="text-sm">{formatDate(i.dueDate)}</div>
                  <div className={`text-xs ${overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                    {overdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
                  </div>
                </div>
              );
            },
          },
        ]}
      />
    </div>
  );
}
