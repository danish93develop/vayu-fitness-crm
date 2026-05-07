import Link from "next/link";
import { notFound } from "next/navigation";
import { Receipt, ExternalLink } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getPaymentById } from "@/server/services/payments";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { VoidPaymentButton } from "@/components/forms/void-payment-button";
import { RefundPaymentButton } from "@/components/forms/refund-payment-button";
import { formatDate, formatDateTime } from "@/lib/date";
import { formatPaiseShort } from "@/lib/money";

export const metadata = { title: "Payment" };
export const dynamic = "force-dynamic";

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("payments:read");
  const { id } = await params;
  const payment = await getPaymentById(session.user.gymId, id);
  if (!payment) notFound();

  const canVoid = can(session.user.role, "payments:void");
  const canRefund = can(session.user.role, "payments:refund");
  const isVoidable = payment.status === "PAID" || payment.status === "PARTIAL";
  const isRefundable = payment.status === "PAID" || payment.status === "PARTIAL";

  return (
    <div className="space-y-6">
      <PageHeader
        title={payment.paymentCode}
        description={
          <span className="flex items-center gap-2">
            <StatusBadge status={payment.status} />
            <span>{formatDate(payment.paymentDate)}</span>
          </span>
        }
        actions={
          <>
            {payment.invoice && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/invoices/${payment.invoice.id}` as never}>
                  <Receipt className="h-4 w-4" /> View invoice
                </Link>
              </Button>
            )}
            {canRefund && isRefundable && (
              <RefundPaymentButton
                paymentId={payment.id}
                paymentAmount={formatPaiseShort(payment.totalPaise)}
              />
            )}
            {canVoid && isVoidable && <VoidPaymentButton paymentId={payment.id} />}
          </>
        }
      />

      {payment.status === "VOID" && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <strong className="text-destructive">Voided</strong>
          {payment.voidedAt && (
            <span className="ml-2 text-muted-foreground">
              on {formatDateTime(payment.voidedAt)}
            </span>
          )}
          {payment.voidReason && (
            <div className="mt-1 text-muted-foreground">Reason: {payment.voidReason}</div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Member"
              value={
                <Link href={`/members/${payment.member.id}` as never} className="font-medium hover:underline">
                  {payment.member.fullName}
                </Link>
              }
            />
            <Field label="Phone" value={payment.member.phone} />
            <Field
              label="Membership"
              value={
                payment.membership ? (
                  <Link
                    href={`/memberships/${payment.membership.id}` as never}
                    className="hover:underline"
                  >
                    {payment.membership.plan.name}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {payment.membership.membershipCode}
                    </span>
                    <ExternalLink className="ml-1 inline h-3 w-3" />
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <Field label="Mode" value={payment.mode} />
            {payment.reference && <Field label="Reference" value={payment.reference} />}
            <Field label="Received by" value={payment.receivedBy?.name ?? "—"} />
            <Field label="Date" value={formatDate(payment.paymentDate)} />
            {payment.installment && (
              <Field
                label="Installment"
                value={`${payment.installment.installmentNumber} of 2`}
              />
            )}
            {payment.notes && (
              <Field label="Notes" value={<span className="whitespace-pre-wrap">{payment.notes}</span>} className="sm:col-span-2" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <Row label="Amount" value={formatPaiseShort(payment.amountPaise)} />
              {payment.discountPaise > 0 && (
                <>
                  <Row
                    label="Discount"
                    value={`− ${formatPaiseShort(payment.discountPaise)}`}
                  />
                  {payment.discountReason && (
                    <p className="text-xs text-muted-foreground">
                      Reason: {payment.discountReason}
                    </p>
                  )}
                </>
              )}
              <Row label="Taxable" value={formatPaiseShort(payment.taxablePaise)} />
              <Row
                label={`GST (${payment.gstPercent}%)`}
                value={`+ ${formatPaiseShort(payment.gstPaise)}`}
              />
              <hr className="my-1 border-border" />
              <Row
                label="Total"
                value={formatPaiseShort(payment.totalPaise)}
                bold
              />
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "text-base font-semibold" : ""}`}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
