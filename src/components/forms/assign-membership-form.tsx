"use client";

import { useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Package, IndianRupee, Clock } from "lucide-react";
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
import { AssignMembershipSchema, type AssignMembershipInput } from "@/lib/validations/membership";
import { assignMembershipAction } from "@/server/actions/memberships";
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

type Member = { id: string; fullName: string; memberCode: string };

type Props = {
  members: Member[];
  plans: Plan[];
  defaultMemberId?: string;
  canDiscount: boolean;
};

export function AssignMembershipForm({ members, plans, defaultMemberId, canDiscount }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<AssignMembershipInput>({
    resolver: zodResolver(AssignMembershipSchema),
    defaultValues: {
      memberId: defaultMemberId ?? "",
      planId: "",
      startDate: new Date().toISOString().slice(0, 10),
      discountRupees: 0,
      discountReason: "",
      markAsPaid: false,
      notes: "",
    },
  });

  const planId = form.watch("planId");
  const startDate = form.watch("startDate");
  const discount = form.watch("discountRupees");

  const plan = useMemo(() => plans.find((p) => p.id === planId), [plans, planId]);
  const endDate = useMemo(() => {
    if (!plan || !startDate) return null;
    return computeEndDate(new Date(startDate), plan.durationValue, plan.durationUnit);
  }, [plan, startDate]);

  const finalPaise = plan
    ? Math.max(0, plan.basePricePaise - Math.round((discount || 0) * 100))
    : 0;

  useEffect(() => {
    if (!canDiscount) form.setValue("discountRupees", 0);
  }, [canDiscount, form]);

  function onSubmit(values: AssignMembershipInput) {
    startTransition(async () => {
      const result = await assignMembershipAction(values);
      if (result.ok) {
        toast.success("Membership assigned.");
        router.push(`/memberships/${result.data.id}` as never);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <SettingsSection
          number={1}
          variant="emerald"
          icon={Package}
          title="Member &amp; plan"
          description="Pick the member receiving the membership and the plan they're buying. The end date is computed automatically from the plan's duration."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="memberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={pending}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a member" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.fullName} · {m.memberCode}
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
              name="planId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={pending}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
                    </FormControl>
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
                <Input
                  value={endDate ? endDate.toISOString().slice(0, 10) : ""}
                  readOnly
                  disabled
                  placeholder="Pick a plan and start date"
                />
              </FormControl>
            </FormItem>
          </div>
        </SettingsSection>

        <SettingsSection
          number={2}
          variant="sky"
          icon={IndianRupee}
          title="Pricing"
          description="GST is added at payment time, not stored on the membership. Discounts require a reason and are written to the audit log."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormItem>
              <FormLabel>Base price</FormLabel>
              <FormControl>
                <Input value={plan ? paiseToRupees(plan.basePricePaise).toString() : "0"} readOnly disabled />
              </FormControl>
            </FormItem>
            <FormField
              control={form.control}
              name="discountRupees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount (₹)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={0} disabled={pending || !canDiscount} />
                  </FormControl>
                  {!canDiscount && (
                    <p className="text-xs text-muted-foreground">Your role can&apos;t apply discounts.</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Final price</FormLabel>
              <FormControl>
                <Input
                  value={formatPaiseShort(finalPaise)}
                  readOnly
                  disabled
                  className="font-semibold"
                />
              </FormControl>
            </FormItem>
          </div>
          {canDiscount && (discount ?? 0) > 0 && (
            <FormField
              control={form.control}
              name="discountReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount reason *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={pending} placeholder="Loyalty discount, festival offer, etc." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </SettingsSection>

        <SettingsSection
          number={3}
          variant="violet"
          icon={Clock}
          title="Payment status"
          description="Choose 'Pending payment' (recommended) so you can take the actual payment via the Payments module — that records the transaction and generates an invoice. Use 'Mark as paid' only for historical entries with external receipts."
        >
          <FormField
            control={form.control}
            name="markAsPaid"
            render={({ field }) => (
              <FormItem>
                <Select
                  value={field.value ? "paid" : "pending"}
                  onValueChange={(v) => field.onChange(v === "paid")}
                  disabled={pending}
                >
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending payment (membership inactive)</SelectItem>
                    <SelectItem value="paid">Mark as paid &mdash; activate immediately</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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
            <Link href={"/memberships" as never}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Assign membership
          </Button>
        </div>
      </form>
    </Form>
  );
}
