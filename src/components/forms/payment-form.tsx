"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Banknote,
  Smartphone,
  CreditCard,
  Building2,
  MoreHorizontal,
  Receipt,
  CalendarClock,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { PaymentSchema, type PaymentInput } from "@/lib/validations/payment";
import { createPaymentAction } from "@/server/actions/payments";
import { paiseToRupees, formatPaiseShort } from "@/lib/money";
import { addDays, formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { PlanDurationUnit, PaymentMode } from "@prisma/client";

type Membership = {
  id: string;
  membershipCode: string;
  finalPricePaise: number;
  paymentStatus: string;
  status: string;
  member: { id: string; fullName: string; memberCode: string };
  plan: {
    id: string;
    name: string;
    durationValue: number;
    durationUnit: PlanDurationUnit;
    allowsInstallments: boolean;
  };
  paid: number;
  remaining: number;
  totalDue: number;
  pendingInstallment: { number: number; amountPaise: number } | null;
  hasInstallments: boolean;
};

type Props = {
  membership: Membership;
  gstPercent: number;
  canDiscount: boolean;
};

const MODES: { value: PaymentMode; label: string; icon: LucideIcon; tone: string }[] = [
  { value: "CASH", label: "Cash", icon: Banknote, tone: "emerald" },
  { value: "UPI", label: "UPI", icon: Smartphone, tone: "violet" },
  { value: "CARD", label: "Card", icon: CreditCard, tone: "sky" },
  { value: "BANK_TRANSFER", label: "Bank", icon: Building2, tone: "amber" },
  { value: "OTHER", label: "Other", icon: MoreHorizontal, tone: "slate" },
];

const TONE_STYLES: Record<string, { active: string; idle: string }> = {
  emerald: {
    active:
      "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500",
    idle: "hover:border-emerald-300 hover:bg-emerald-500/5",
  },
  violet: {
    active:
      "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-500",
    idle: "hover:border-violet-300 hover:bg-violet-500/5",
  },
  sky: {
    active:
      "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500",
    idle: "hover:border-sky-300 hover:bg-sky-500/5",
  },
  amber: {
    active:
      "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500",
    idle: "hover:border-amber-300 hover:bg-amber-500/5",
  },
  slate: {
    active:
      "border-slate-500 bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500",
    idle: "hover:border-slate-300 hover:bg-slate-500/5",
  },
};

export function PaymentForm({ membership, gstPercent, canDiscount }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const monthsDuration =
    membership.plan.durationUnit === "YEAR"
      ? membership.plan.durationValue * 12
      : membership.plan.durationUnit === "MONTH"
        ? membership.plan.durationValue
        : Math.floor(membership.plan.durationValue / 30);
  const installmentsAllowed =
    membership.plan.allowsInstallments &&
    monthsDuration >= 12 &&
    !membership.hasInstallments;

  const defaultAmount = useMemo(() => {
    if (membership.pendingInstallment) {
      return paiseToRupees(membership.pendingInstallment.amountPaise);
    }
    const remainingPreGst = Math.round(
      membership.remaining / (1 + gstPercent / 100),
    );
    return paiseToRupees(remainingPreGst);
  }, [membership, gstPercent]);

  const form = useForm<PaymentInput>({
    resolver: zodResolver(PaymentSchema),
    defaultValues: {
      membershipId: membership.id,
      amountRupees: defaultAmount,
      discountRupees: 0,
      discountReason: "",
      mode: "CASH",
      paymentDate: new Date().toISOString().slice(0, 10),
      reference: "",
      notes: "",
      asInstallment: false,
      secondInstallmentDueDate: addDays(new Date(), 180).toISOString().slice(0, 10),
    },
  });

  const amountRupees = form.watch("amountRupees");
  const discountRupees = form.watch("discountRupees");
  const asInstallment = form.watch("asInstallment");
  const mode = form.watch("mode");

  const grossPaise = Math.round((amountRupees || 0) * 100);
  const discountPaise = Math.round((discountRupees || 0) * 100);
  const taxablePaise = Math.max(0, grossPaise - discountPaise);
  const gstPaise = Math.round((taxablePaise * gstPercent) / 100);
  const totalPaise = taxablePaise + gstPaise;

  const paidPct =
    membership.totalDue > 0
      ? Math.min(100, Math.round((membership.paid / membership.totalDue) * 100))
      : 0;

  const initials = membership.member.fullName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function onSubmit(values: PaymentInput) {
    startTransition(async () => {
      const result = await createPaymentAction(values);
      if (result.ok) {
        toast.success("Payment recorded. Invoice generated.", { duration: 4000 });
        if (result.data.invoiceId) {
          router.push(`/invoices/${result.data.invoiceId}` as never);
        } else {
          router.push(`/payments/${result.data.paymentId}` as never);
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Member context card ───────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[hsl(84,81%,56%)] opacity-15 blur-3xl"
          />

          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-lg font-bold text-[hsl(222,47%,11%)] shadow-glow-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold">{membership.member.fullName}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {membership.member.memberCode}
                </span>
                <StatusBadge status={membership.status} size="sm" />
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {membership.plan.name} ·{" "}
                <span className="font-mono text-xs">{membership.membershipCode}</span>
              </div>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-3 sm:gap-6">
            <SummaryStat
              label="Total due"
              value={formatPaiseShort(membership.totalDue)}
              hint="incl. GST"
            />
            <SummaryStat
              label="Already paid"
              value={formatPaiseShort(membership.paid)}
              hint={`${paidPct}%`}
              tone="accent"
            />
            <SummaryStat
              label="Remaining"
              value={formatPaiseShort(membership.remaining)}
              tone="primary"
              highlight
            />
          </div>

          <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-primary transition-all duration-500"
              style={{ width: `${paidPct}%` }}
            />
          </div>

          {membership.pendingInstallment && (
            <div className="relative mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>Installment {membership.pendingInstallment.number} of 2</strong> is due —
                this payment will auto-mark it paid.
              </span>
            </div>
          )}
        </section>

        {/* ── 2-column layout: form left, sticky receipt right ──────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT — form */}
          <div className="space-y-6 lg:col-span-2">
            {installmentsAllowed && (
              <section className="rounded-xl border border-border bg-card p-5">
                <SectionHeader number={1} title="Payment plan" />
                <FormField
                  control={form.control}
                  name="asInstallment"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <PlanCard
                          active={!field.value}
                          onClick={() => {
                            field.onChange(false);
                            form.setValue(
                              "amountRupees",
                              paiseToRupees(membership.finalPricePaise),
                            );
                          }}
                          title="Pay full amount"
                          description="Single payment, fully paid"
                          amount={formatPaiseShort(membership.finalPricePaise)}
                          icon={CheckCircle2}
                          disabled={pending}
                        />
                        <PlanCard
                          active={field.value}
                          onClick={() => {
                            field.onChange(true);
                            form.setValue(
                              "amountRupees",
                              paiseToRupees(Math.round(membership.finalPricePaise / 2)),
                            );
                          }}
                          title="1st of 2 installments"
                          description="Half now, rest later"
                          amount={formatPaiseShort(Math.round(membership.finalPricePaise / 2))}
                          icon={Sparkles}
                          disabled={pending}
                          badge="Annual only"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {asInstallment && (
                  <FormField
                    control={form.control}
                    name="secondInstallmentDueDate"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>2nd installment due date *</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" disabled={pending} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </section>
            )}

            <section className="rounded-xl border border-border bg-card p-5">
              <SectionHeader number={installmentsAllowed ? 2 : 1} title="Amount & date" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="amountRupees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₹) *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            ₹
                          </span>
                          <Input
                            {...field}
                            type="number"
                            min={0}
                            step="0.01"
                            disabled={pending}
                            className="pl-7 text-base font-semibold tabular-nums"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" disabled={pending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <SectionHeader number={installmentsAllowed ? 3 : 2} title="Payment mode" />
              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {MODES.map((m) => {
                        const Icon = m.icon;
                        const active = field.value === m.value;
                        const styles = TONE_STYLES[m.tone]!;
                        return (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => field.onChange(m.value)}
                            disabled={pending}
                            className={cn(
                              "flex flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-3 text-xs font-medium transition-all",
                              active
                                ? cn("ring-2 ring-offset-2", styles.active)
                                : cn(
                                    "border-border bg-background text-muted-foreground",
                                    styles.idle,
                                  ),
                            )}
                          >
                            <Icon className="h-5 w-5" />
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {mode !== "CASH" && (
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Reference / Transaction ID</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={pending}
                          placeholder={
                            mode === "UPI"
                              ? "UPI transaction ID"
                              : mode === "CARD"
                                ? "Last 4 digits / authorization code"
                                : "Transaction reference"
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <SectionHeader
                number={installmentsAllowed ? 4 : 3}
                title="Discount"
                hint="optional"
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="discountRupees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₹)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            ₹
                          </span>
                          <Input
                            {...field}
                            type="number"
                            min={0}
                            step="0.01"
                            disabled={pending || !canDiscount}
                            className="pl-7"
                          />
                        </div>
                      </FormControl>
                      {!canDiscount && (
                        <p className="text-xs text-muted-foreground">
                          Your role can&apos;t apply discounts.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {canDiscount && (discountRupees ?? 0) > 0 && (
                  <FormField
                    control={form.control}
                    name="discountReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={pending} placeholder="Loyalty, promo, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </section>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={2}
                      disabled={pending}
                      placeholder="Anything noteworthy about this payment…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* RIGHT — sticky receipt preview */}
          <aside className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="border-b border-border bg-gradient-to-br from-muted/40 to-transparent px-5 py-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Receipt className="h-3.5 w-3.5" />
                    Receipt preview
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDate(form.watch("paymentDate") || new Date())}
                  </div>
                </div>
                <div className="space-y-3 px-5 py-4 text-sm">
                  <BreakdownRow label="Amount" value={formatPaiseShort(grossPaise)} />
                  {discountPaise > 0 && (
                    <BreakdownRow
                      label="Discount"
                      value={`− ${formatPaiseShort(discountPaise)}`}
                      tone="accent"
                    />
                  )}
                  <BreakdownRow label="Taxable" value={formatPaiseShort(taxablePaise)} muted />
                  <BreakdownRow
                    label={`GST (${gstPercent}%)`}
                    value={`+ ${formatPaiseShort(gstPaise)}`}
                    muted
                  />
                </div>
                <div className="border-t border-border bg-gradient-primary-soft px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                      Total
                    </span>
                    <span className="text-2xl font-bold tabular-nums text-gradient-primary">
                      {formatPaiseShort(totalPaise)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  type="submit"
                  disabled={pending || totalPaise === 0}
                  className="w-full"
                  size="lg"
                >
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <Receipt className="h-4 w-4" />
                      Record payment
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  className="w-full"
                  disabled={pending}
                >
                  <Link href={`/memberships/${membership.id}` as never}>Cancel</Link>
                </Button>
              </div>

              <p className="text-center text-[11px] text-muted-foreground">
                A GST invoice will be generated automatically.
              </p>
            </div>
          </aside>
        </div>
      </form>
    </Form>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function SectionHeader({
  number,
  title,
  hint,
}: {
  number: number;
  title: string;
  hint?: string;
}) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-foreground">
        {number}
      </span>
      {title}
      {hint && (
        <span className="ml-1 text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
          ({hint})
        </span>
      )}
    </h2>
  );
}

function SummaryStat({
  label,
  value,
  hint,
  tone = "default",
  highlight = false,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "accent" | "primary";
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-xl font-bold tabular-nums",
          highlight && "text-gradient-primary",
          tone === "accent" && !highlight && "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function PlanCard({
  active,
  onClick,
  title,
  description,
  amount,
  icon: Icon,
  disabled,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  amount: string;
  icon: LucideIcon;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all",
        active
          ? "border-emerald-500 bg-emerald-500/10 shadow-sm ring-2 ring-emerald-500/30"
          : "border-border bg-background hover:border-emerald-300 hover:bg-emerald-500/5",
      )}
    >
      <div className="flex w-full items-start justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            active ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        {badge && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-3 text-sm font-semibold">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      <div
        className={cn(
          "mt-2 text-lg font-bold tabular-nums",
          active ? "text-emerald-700 dark:text-emerald-300" : "text-foreground",
        )}
      >
        {amount}
      </div>
    </button>
  );
}

function BreakdownRow({
  label,
  value,
  muted,
  tone,
}: {
  label: string;
  value: string;
  muted?: boolean;
  tone?: "accent";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-sm", muted ? "text-muted-foreground" : "text-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          muted ? "text-sm text-muted-foreground" : "text-sm font-medium",
          tone === "accent" && "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {value}
      </span>
    </div>
  );
}
