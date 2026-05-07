"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, RotateCw } from "lucide-react";
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
import { RenewMembershipSchema, type RenewMembershipInput } from "@/lib/validations/membership";
import { renewMembershipAction } from "@/server/actions/memberships";
import { paiseToRupees, formatPaiseShort } from "@/lib/money";
import { computeEndDate, formatDuration } from "@/lib/membership-utils";
import type { PlanDurationUnit, PlanType } from "@prisma/client";

type Plan = {
  id: string;
  name: string;
  type: PlanType;
  durationValue: number;
  durationUnit: PlanDurationUnit;
  basePricePaise: number;
};

type Props = {
  oldMembershipId: string;
  oldEndDate: string;
  oldPlanId: string;
  plans: Plan[];
  canDiscount: boolean;
  memberId: string;
  memberName: string;
};

export function RenewMembershipForm({
  oldMembershipId,
  oldEndDate,
  oldPlanId,
  plans,
  canDiscount,
  memberName,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const defaultStart = useMemo(() => {
    const oldEnd = new Date(oldEndDate);
    const today = new Date();
    const candidate = new Date(oldEnd);
    candidate.setDate(candidate.getDate() + 1);
    return (candidate > today ? candidate : today).toISOString().slice(0, 10);
  }, [oldEndDate]);

  const form = useForm<RenewMembershipInput>({
    resolver: zodResolver(RenewMembershipSchema),
    defaultValues: {
      planId: oldPlanId,
      startDate: defaultStart,
      discountRupees: 0,
      discountReason: "",
      markAsPaid: false,
      notes: "",
    },
  });

  const planId = form.watch("planId");
  const startDate = form.watch("startDate");
  const discount = form.watch("discountRupees");
  const plan = plans.find((p) => p.id === planId);
  const endDate = useMemo(() => {
    if (!plan || !startDate) return null;
    return computeEndDate(new Date(startDate), plan.durationValue, plan.durationUnit);
  }, [plan, startDate]);

  const finalPaise = plan ? Math.max(0, plan.basePricePaise - Math.round((discount || 0) * 100)) : 0;

  function onSubmit(values: RenewMembershipInput) {
    startTransition(async () => {
      const result = await renewMembershipAction(oldMembershipId, values);
      if (result.ok) {
        toast.success("Membership renewed.");
        router.push(`/memberships/${result.data.id}` as never);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
          Renewing for <strong>{memberName}</strong>. The previous membership stays in their history
          for audit. Take the renewal payment via the Payments module after creating it.
        </div>

        <SettingsSection
          number={1}
          variant="sky"
          icon={RotateCw}
          title="Renewal details"
          description="A new membership is created with these details. The old one stays untouched in the member's history."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="planId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={pending}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} · {formatPaiseShort(p.basePricePaise)} · {formatDuration(p.durationValue, p.durationUnit)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date *</FormLabel>
                  <FormControl><Input {...field} type="date" disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>End date (auto)</FormLabel>
              <FormControl>
                <Input value={endDate ? endDate.toISOString().slice(0, 10) : ""} readOnly disabled />
              </FormControl>
            </FormItem>
            <FormItem>
              <FormLabel>Final price</FormLabel>
              <FormControl><Input value={formatPaiseShort(finalPaise)} readOnly disabled className="font-semibold" /></FormControl>
            </FormItem>
            <FormField
              control={form.control}
              name="discountRupees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount (₹)</FormLabel>
                  <FormControl><Input {...field} type="number" min={0} disabled={pending || !canDiscount} /></FormControl>
                  {!canDiscount && <p className="text-xs text-muted-foreground">Your role can&apos;t apply discounts.</p>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="markAsPaid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment</FormLabel>
                  <Select
                    value={field.value ? "paid" : "pending"}
                    onValueChange={(v) => field.onChange(v === "paid")}
                    disabled={pending}
                  >
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Mark as paid</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {canDiscount && (discount ?? 0) > 0 && (
            <FormField
              control={form.control}
              name="discountReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount reason *</FormLabel>
                  <FormControl><Input {...field} disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea {...field} rows={2} disabled={pending} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsSection>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" asChild disabled={pending}>
            <Link href={`/memberships/${oldMembershipId}` as never}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Renew membership
          </Button>
        </div>
      </form>
    </Form>
  );
}
