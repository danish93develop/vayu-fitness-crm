import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { listPayments } from "@/server/services/payments";
import { PageHeader } from "@/components/layout/page-header";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { DataTable } from "@/components/tables/data-table";
import { TablePagination } from "@/components/tables/pagination";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatPaiseShort } from "@/lib/money";
import { formatDate } from "@/lib/date";
import type { PaymentStatus } from "@prisma/client";

export const metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

const statusOptions = [
  { value: "PAID", label: "Paid" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "VOID", label: "Void" },
];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await requirePermission("payments:read");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { items, total, pageCount, pageSize } = await listPayments(session.user.gymId, {
    search: sp.q ?? "",
    status: (sp.status as PaymentStatus | undefined) ?? "ALL",
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        description="Every transaction is preserved. Voiding is the only way to invalidate a payment."
      />

      <TableToolbar
        searchPlaceholder="Search by member, code, reference…"
        filterLabel="Status"
        filterOptions={statusOptions}
        newHref="/payments/new"
        newLabel="Take payment"
      />

      <DataTable
        rows={items}
        rowKey={(p) => p.id}
        emptyMessage="No payments yet."
        columns={[
          {
            key: "code",
            header: "Code",
            cell: (p) => (
              <Link
                href={`/payments/${p.id}` as never}
                className="font-mono text-xs hover:underline"
              >
                {p.paymentCode}
              </Link>
            ),
          },
          {
            key: "member",
            header: "Member",
            cell: (p) => (
              <Link
                href={`/members/${p.member.id}` as never}
                className="font-medium hover:underline"
              >
                {p.member.fullName}
              </Link>
            ),
          },
          {
            key: "plan",
            header: "Plan",
            cell: (p) => <span className="text-sm text-muted-foreground">{p.membership?.plan.name ?? "—"}</span>,
          },
          {
            key: "mode",
            header: "Mode",
            cell: (p) => <span className="text-xs text-muted-foreground">{p.mode}</span>,
          },
          {
            key: "date",
            header: "Date",
            cell: (p) => <span className="text-sm">{formatDate(p.paymentDate)}</span>,
          },
          {
            key: "amount",
            header: "Total",
            cell: (p) => (
              <span className="font-semibold tabular-nums">
                {formatPaiseShort(p.totalPaise)}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (p) => <StatusBadge status={p.status} />,
          },
          {
            key: "invoice",
            header: "Invoice",
            cell: (p) =>
              p.invoice ? (
                <Link
                  href={`/invoices/${p.invoice.id}` as never}
                  className="text-xs text-accent hover:underline"
                >
                  {p.invoice.invoiceNumber}
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              ),
          },
        ]}
      />

      <TablePagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} />
    </div>
  );
}
