"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Package, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SettingsSection } from "./settings-section";
import { PlanSchema, type PlanInput } from "@/lib/validations/plan";
import { createPlanAction, updatePlanAction } from "@/server/actions/plans";

const TYPE_LABELS: Record<string, string> = {
  MAIN_MEMBERSHIP: "Main Membership",
  ADD_ON: "Add-on",
  CLASS_PACKAGE: "Class Package",
  PERSONAL_TRAINING: "Personal Training",
};

type Props = {
  mode: "create" | "edit";
  defaultValues?: Partial<PlanInput>;
  planId?: string;
};

export function PlanForm({ mode, defaultValues, planId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<PlanInput>({
    resolver: zodResolver(PlanSchema),
    defaultValues: {
      name: "",
      type: "MAIN_MEMBERSHIP",
      durationValue: 1,
      durationUnit: "MONTH",
      priceRupees: 0,
      description: "",
      allowsInstallments: false,
      maxInstallments: 1,
      isActive: true,
      sortOrder: 0,
      ...defaultValues,
    },
  });

  const allowsInstallments = form.watch("allowsInstallments");

  // Live preview values
  const planName = form.watch("name");
  const planType = form.watch("type");
  const durationValue = Number(form.watch("durationValue")) || 0;
  const durationUnit = form.watch("durationUnit");
  const priceRupees = Number(form.watch("priceRupees")) || 0;

  function onSubmit(values: PlanInput) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createPlanAction(values)
          : await updatePlanAction(planId!, values);

      if (result.ok) {
        toast.success(mode === "create" ? "Plan created." : "Plan updated.");
        router.push("/plans" as never);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const durationLabel =
    durationValue === 1
      ? durationUnit.toLowerCase()
      : `${durationValue} ${durationUnit.toLowerCase()}s`;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <SettingsSection
          number={1}
          variant="emerald"
          icon={Package}
          title="Plan details"
          description="What members are buying. The price is in rupees pre-GST — tax is added at payment time."
        >
          {/* Live plan preview */}
          <div className="overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Live preview
                </div>
                <div className="mt-1 truncate text-base font-semibold">
                  {planName || "Untitled plan"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-300">
                    {TYPE_LABELS[planType] ?? planType}
                  </span>
                  <span>· {durationLabel}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold tabular-nums text-emerald-900 dark:text-emerald-200">
                  ₹{priceRupees.toLocaleString("en-IN")}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  pre-GST
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan name *</FormLabel>
                  <FormControl><Input {...field} disabled={pending} placeholder="Annual Gym Membership" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={pending}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="MAIN_MEMBERSHIP">Main Membership</SelectItem>
                      <SelectItem value="ADD_ON">Add-on</SelectItem>
                      <SelectItem value="CLASS_PACKAGE">Class Package</SelectItem>
                      <SelectItem value="PERSONAL_TRAINING">Personal Training</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="durationValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration value *</FormLabel>
                  <FormControl><Input {...field} type="number" min={1} disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="durationUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration unit *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={pending}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="DAY">Days</SelectItem>
                      <SelectItem value="MONTH">Months</SelectItem>
                      <SelectItem value="YEAR">Years</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priceRupees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (₹) *</FormLabel>
                  <FormControl>
                    <div className="relative flex items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                      <span className="pointer-events-none absolute left-3 text-sm text-muted-foreground">₹</span>
                      <Input {...field} type="number" min={0} step={1} disabled={pending} className="border-0 pl-7 focus-visible:ring-0" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort order</FormLabel>
                  <FormControl><Input {...field} type="number" disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} rows={3} disabled={pending} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsSection>

        <SettingsSection
          number={2}
          variant="violet"
          icon={CreditCard}
          title="Installments &amp; status"
          description="Per business rules, only plans of 12 months or longer can be paid in installments. Annual plans default to a maximum of 2 installments."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="allowsInstallments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allow installments</FormLabel>
                  <Select
                    value={field.value ? "yes" : "no"}
                    onValueChange={(v) => field.onChange(v === "yes")}
                    disabled={pending}
                  >
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {allowsInstallments && (
              <FormField
                control={form.control}
                name="maxInstallments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max installments *</FormLabel>
                    <FormControl><Input {...field} type="number" min={2} max={12} disabled={pending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={field.value ? "active" : "inactive"}
                    onValueChange={(v) => field.onChange(v === "active")}
                    disabled={pending}
                  >
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </SettingsSection>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" asChild disabled={pending}>
            <Link href={"/plans" as never}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "create" ? "Create plan" : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
