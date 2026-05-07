"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  Receipt,
  Percent,
  Loader2,
  Sparkles,
  RotateCcw,
  Mail,
  Phone,
  MapPin,
  CalendarClock,
} from "lucide-react";
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
import { SettingsSchema, type SettingsInput } from "@/lib/validations/settings";
import { updateSettingsAction } from "@/server/actions/settings";
import { SettingsSection } from "./settings-section";
import { addDays, formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";

type Props = { defaultValues: SettingsInput };

export function SettingsForm({ defaultValues }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<SettingsInput>({
    resolver: zodResolver(SettingsSchema),
    defaultValues,
  });

  const dirty = form.formState.isDirty;

  // Watch fields for live previews
  const gymName = form.watch("name");
  const gymPhone = form.watch("phone");
  const gymAddress = form.watch("address");
  const invoicePrefix = form.watch("invoicePrefix");
  const gstPercent = Number(form.watch("defaultGstPct")) || 0;
  const expiryDays = Number(form.watch("expiryAlertDays")) || 0;

  const initials = useMemo(
    () =>
      (gymName || "VF")
        .split(" ")
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    [gymName],
  );

  // Live GST math example using ₹2,000 as a recognizable round number
  const sampleAmount = 2000;
  const sampleGst = Math.round((sampleAmount * gstPercent) / 100);
  const sampleTotal = sampleAmount + sampleGst;

  // Live "expiring soon" example date
  const sampleExpiryDate = addDays(new Date(), expiryDays);

  function onSubmit(values: SettingsInput) {
    startTransition(async () => {
      const result = await updateSettingsAction(values);
      if (result.ok) {
        toast.success("Settings saved.");
        form.reset(values);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDiscard() {
    form.reset(defaultValues);
    toast.info("Changes discarded.");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="pb-24">
        <div className="space-y-8">
          {/* ── Brand info ─────────────────────────────────────────────── */}
          <SettingsSection
            number={1}
            variant="emerald"
            icon={Building2}
            title="Brand info"
            description="Used in the sidebar, login page, and as snapshot fields on every printed invoice."
          >
            {/* Live brand preview */}
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-sm font-bold text-[hsl(222,47%,11%)] shadow-glow-sm">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {gymName || "Your gym name"}
                    </div>
                    <div className="text-xs text-white/60">CRM &amp; Membership</div>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
                  Sidebar preview
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gym name *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={pending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="legalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Legal name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={pending} placeholder="Vayu Fitness Pvt Ltd" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <PrefixInput icon={Mail}>
                        <Input
                          {...field}
                          type="email"
                          disabled={pending}
                          className="border-0 pl-9 focus-visible:ring-0"
                        />
                      </PrefixInput>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <PrefixInput icon={Phone}>
                        <Input
                          {...field}
                          disabled={pending}
                          className="border-0 pl-9 focus-visible:ring-0"
                        />
                      </PrefixInput>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    Address
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} disabled={pending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsSection>

          {/* ── Invoice settings ───────────────────────────────────────── */}
          <SettingsSection
            number={2}
            variant="sky"
            icon={Receipt}
            title="Invoice settings"
            description="These fields appear on every printed invoice and receipt. Snapshots are captured at issue time, so editing here only affects future invoices."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="invoicePrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice number prefix *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={pending}
                        placeholder="VF-INV"
                        className="font-mono uppercase"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Examples:{" "}
                      <span className="rounded bg-sky-500/15 px-1.5 py-0.5 font-mono text-[11px] text-sky-700 dark:text-sky-300">
                        {invoicePrefix || "VF-INV"}-0001
                      </span>{" "}
                      <span className="rounded bg-sky-500/15 px-1.5 py-0.5 font-mono text-[11px] text-sky-700 dark:text-sky-300">
                        {invoicePrefix || "VF-INV"}-0002
                      </span>
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gstNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GSTIN</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={pending}
                        placeholder="22AAAAA0000A1Z5"
                        className="font-mono uppercase"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Your 15-character GST identification number, shown on invoices.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="invoiceTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice terms</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} disabled={pending} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Shown in the &ldquo;Terms&rdquo; section at the bottom of every invoice.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="invoiceFooter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Footer text</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} disabled={pending} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Tagline at the very bottom of the invoice — usually a thank-you note.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Live mini-invoice preview */}
            <div className="overflow-hidden rounded-xl border border-sky-200/60 bg-white shadow-sm">
              <div className="bg-slate-900 px-4 py-3 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/60">
                      Mini preview
                    </div>
                    <div className="text-sm font-semibold">{gymName || "Your gym"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-white/60">
                      Invoice
                    </div>
                    <div className="font-mono text-sm">{invoicePrefix || "VF-INV"}-0001</div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>{gymPhone || "+91 …"}</span>
                  {gymAddress && (
                    <span className="ml-2 truncate text-right">{gymAddress.split("\n")[0]}</span>
                  )}
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* ── Tax + alerts ───────────────────────────────────────────── */}
          <SettingsSection
            number={3}
            variant="violet"
            icon={Percent}
            title="Tax &amp; alerts"
            description="GST percentage applies to every new payment. Expiry alert window controls when memberships are flagged 'Expiring Soon' on the dashboard."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="defaultGstPct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default GST percentage *</FormLabel>
                    <FormControl>
                      <SuffixInput suffix="%">
                        <Input
                          {...field}
                          type="number"
                          min={0}
                          max={50}
                          disabled={pending}
                          className="border-0 pr-12 focus-visible:ring-0"
                        />
                      </SuffixInput>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      India standard is{" "}
                      <span className="font-medium text-foreground">18%</span>. Past invoices keep
                      their original rate.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiryAlertDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry alert window *</FormLabel>
                    <FormControl>
                      <SuffixInput suffix="days">
                        <Input
                          {...field}
                          type="number"
                          min={1}
                          max={60}
                          disabled={pending}
                          className="border-0 pr-14 focus-visible:ring-0"
                        />
                      </SuffixInput>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Memberships ending within this many days get the &ldquo;Expiring Soon&rdquo; flag.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Live previews */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* GST math preview */}
              <div className="overflow-hidden rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                  <Sparkles className="h-3 w-3" />
                  Live GST example
                </div>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Plan price</dt>
                    <dd className="font-mono tabular-nums">
                      ₹{sampleAmount.toLocaleString("en-IN")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">+ GST {gstPercent}%</dt>
                    <dd className="font-mono tabular-nums text-violet-700 dark:text-violet-300">
                      ₹{sampleGst.toLocaleString("en-IN")}
                    </dd>
                  </div>
                  <div className="border-t border-violet-500/20 pt-1.5">
                    <div className="flex items-center justify-between">
                      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Total billed
                      </dt>
                      <dd className="text-base font-bold tabular-nums text-violet-900 dark:text-violet-200">
                        ₹{sampleTotal.toLocaleString("en-IN")}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>

              {/* Expiry alert preview */}
              <div className="overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  <CalendarClock className="h-3 w-3" />
                  Live expiry rule
                </div>
                <p className="text-sm leading-relaxed">
                  A membership ending on{" "}
                  <span className="font-semibold">{formatDate(sampleExpiryDate)}</span> or sooner
                  will show:
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-600/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Expiring Soon
                </div>
              </div>
            </div>
          </SettingsSection>
        </div>

        {/* ── Sticky save bar ─────────────────────────────────────────── */}
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 transform transition-transform duration-200 ease-out print:hidden",
            dirty ? "translate-y-0" : "translate-y-full",
          )}
        >
          <div className="border-t border-border bg-card/95 shadow-lg backdrop-blur-sm">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                <span className="font-medium">Unsaved changes</span>
                <span className="hidden text-muted-foreground sm:inline">
                  · Save to apply across the system
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDiscard}
                  disabled={pending}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Discard
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}

// ─── Tiny presentational helpers ─────────────────────────────────────────

function PrefixInput({
  icon: Icon,
  children,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <span className="pointer-events-none flex h-10 w-9 items-center justify-center text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      {children}
    </div>
  );
}

function SuffixInput({
  suffix,
  children,
}: {
  suffix: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      {children}
      <span className="pointer-events-none absolute right-3 text-sm font-medium text-muted-foreground">
        {suffix}
      </span>
    </div>
  );
}

