import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { listInvoices } from "@/server/services/invoices";
import { PageHeader } from "@/components/layout/page-header";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { DataTable } from "@/components/tables/data-table";
import { TablePagination } from "@/components/tables/pagination";
import { formatPaiseShort } from "@/lib/money";
import { formatDate } from "@/lib/date";

export const metadata = { title: "Invoices" };
export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requirePermission("invoices:read");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { items, total, pageCount, pageSize } = await listInvoices(session.user.gymId, {
    search: sp.q ?? "",
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Invoices"
        description="GST invoices generated from each payment. Click any row to view & print."
      />

      <TableToolbar searchPlaceholder="Search by invoice number, member…" />

      <DataTable
        rows={items}
        rowKey={(i) => i.id}
        emptyMessage="No invoices yet."
        columns={[
          {
            key: "number",
            header: "Invoice #",
            cell: (i) => (
              <Link
                href={`/invoices/${i.id}` as never}
                className="font-mono text-sm font-medium hover:underline"
              >
                {i.invoiceNumber}
              </Link>
            ),
          },
          {
            key: "member",
            header: "Member",
            cell: (i) => <span className="text-sm">{i.memberNameSnapshot}</span>,
          },
          {
            key: "plan",
            header: "Plan",
            cell: (i) => <span className="text-sm text-muted-foreground">{i.planNameSnapshot}</span>,
          },
          {
            key: "date",
            header: "Date",
            cell: (i) => <span className="text-sm">{formatDate(i.issueDate)}</span>,
          },
          {
            key: "subtotal",
            header: "Taxable",
            cell: (i) => (
              <span className="text-sm tabular-nums text-muted-foreground">
                {formatPaiseShort(i.taxablePaise)}
              </span>
            ),
          },
          {
            key: "gst",
            header: "GST",
            cell: (i) => (
              <span className="text-sm tabular-nums text-muted-foreground">
                {formatPaiseShort(i.gstPaise)} ({i.gstPercent}%)
              </span>
            ),
          },
          {
            key: "total",
            header: "Total",
            cell: (i) => (
              <span className="font-semibold tabular-nums">
                {formatPaiseShort(i.totalPaise)}
              </span>
            ),
          },
        ]}
      />

      <TablePagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} />
    </div>
  );
}
