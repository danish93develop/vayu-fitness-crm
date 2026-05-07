import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getInvoiceById } from "@/server/services/invoices";
import { Button } from "@/components/ui/button";
import { InvoiceActions } from "@/components/dashboard/invoice-actions";
import { formatDate } from "@/lib/date";
import { formatPaiseShort } from "@/lib/money";

export const metadata = { title: "Invoice" };
export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("invoices:read");
  const { id } = await params;
  const inv = await getInvoiceById(session.user.gymId, id);
  if (!inv) notFound();

  return (
    <div className="space-y-4">
      {/* Toolbar — hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link href={"/invoices" as never}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <InvoiceActions invoiceId={inv.id} invoiceNumber={inv.invoiceNumber} />
      </div>

      {/* Invoice paper — A4 width, white bg, print-friendly */}
      <article className="invoice-paper mx-auto max-w-3xl overflow-hidden rounded-lg border border-border bg-white text-[#1F2937] shadow-sm print:m-0 print:max-w-none print:border-0 print:shadow-none">
        {/* Header bar */}
        <header className="flex items-start justify-between gap-6 border-b border-gray-200 bg-[#111827] px-8 py-6 text-white print:bg-[#111827]">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/60">Tax Invoice</div>
            <h1 className="mt-1 text-2xl font-bold">{inv.gymNameSnapshot}</h1>
            <div className="mt-2 space-y-0.5 text-xs text-white/70">
              {inv.gymAddressSnapshot && <div>{inv.gymAddressSnapshot}</div>}
              {inv.gymPhoneSnapshot && <div>{inv.gymPhoneSnapshot}</div>}
              {inv.gymEmailSnapshot && <div>{inv.gymEmailSnapshot}</div>}
              {inv.gymGstSnapshot && <div>GSTIN: {inv.gymGstSnapshot}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-white/60">Invoice</div>
            <div className="mt-1 font-mono text-lg font-semibold">{inv.invoiceNumber}</div>
            <div className="mt-2 text-xs text-white/70">
              Date: <span className="font-medium text-white">{formatDate(inv.issueDate)}</span>
            </div>
            {inv.payment?.paymentCode && (
              <div className="text-xs text-white/70">
                Payment: <span className="font-mono text-white">{inv.payment.paymentCode}</span>
              </div>
            )}
          </div>
        </header>

        {/* Bill to + Plan */}
        <section className="grid grid-cols-2 gap-8 px-8 py-6">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Bill to
            </div>
            <div className="text-base font-semibold">{inv.memberNameSnapshot}</div>
            {inv.memberPhoneSnapshot && (
              <div className="text-sm text-gray-600">{inv.memberPhoneSnapshot}</div>
            )}
            {inv.memberEmailSnapshot && (
              <div className="text-sm text-gray-600">{inv.memberEmailSnapshot}</div>
            )}
            {inv.memberAddressSnapshot && (
              <div className="mt-1 text-sm text-gray-600 whitespace-pre-line">
                {inv.memberAddressSnapshot}
              </div>
            )}
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              For
            </div>
            <div className="text-base font-semibold">{inv.planNameSnapshot}</div>
            {inv.payment?.mode && (
              <div className="mt-2 text-xs text-gray-500">
                Paid via <span className="text-gray-800">{inv.payment.mode.replace("_", " ")}</span>
                {inv.payment.reference && (
                  <span> · ref {inv.payment.reference}</span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Items table */}
        <section className="px-8 py-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 text-left font-medium">Description</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3">
                  <div className="font-medium">{inv.planNameSnapshot}</div>
                  <div className="text-xs text-gray-500">Membership fee</div>
                </td>
                <td className="py-3 text-right tabular-nums">
                  {formatPaiseShort(inv.subtotalPaise)}
                </td>
              </tr>
              {inv.discountPaise > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-600">Discount applied</td>
                  <td className="py-2 text-right tabular-nums text-gray-600">
                    − {formatPaiseShort(inv.discountPaise)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Totals */}
        <section className="px-8 py-4">
          <div className="ml-auto max-w-xs space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatPaiseShort(inv.subtotalPaise)} />
            {inv.discountPaise > 0 && (
              <Row
                label="Discount"
                value={`− ${formatPaiseShort(inv.discountPaise)}`}
              />
            )}
            <Row label="Taxable" value={formatPaiseShort(inv.taxablePaise)} />
            <Row
              label={`GST (${inv.gstPercent}%)`}
              value={`+ ${formatPaiseShort(inv.gstPaise)}`}
            />
            <div className="my-2 h-px bg-gray-300" />
            <Row
              label="Total"
              value={formatPaiseShort(inv.totalPaise)}
              className="text-lg font-bold"
            />
          </div>
        </section>

        {/* Terms + footer */}
        {(inv.termsSnapshot || inv.footerSnapshot) && (
          <footer className="border-t border-gray-200 px-8 py-6">
            {inv.termsSnapshot && (
              <div className="mb-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Terms
                </div>
                <p className="text-xs text-gray-600 whitespace-pre-line">
                  {inv.termsSnapshot}
                </p>
              </div>
            )}
            {inv.footerSnapshot && (
              <p className="text-center text-xs italic text-gray-500">
                {inv.footerSnapshot}
              </p>
            )}
          </footer>
        )}
      </article>

      {/* Print-only CSS — hide everything outside the invoice paper */}
      <style>{`
        @media print {
          body { background: white !important; }
          @page { margin: 12mm; }
          .invoice-paper { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${className ?? ""}`}>
      <span className="text-gray-600">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
