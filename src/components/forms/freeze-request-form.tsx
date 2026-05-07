"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FreezeRequestSchema, type FreezeRequestInput } from "@/lib/validations/freeze";
import { requestFreezeAction } from "@/server/actions/freezes";
import { inclusiveDays } from "@/lib/membership-utils";

type Props = {
  membershipId: string;
  daysAlreadyUsed: number;
  phasesAlreadyUsed: number;
  maxDays: number;
  maxPhases: number;
};

export function FreezeRequestForm({
  membershipId,
  daysAlreadyUsed,
  phasesAlreadyUsed,
  maxDays,
  maxPhases,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const remaining = maxDays - daysAlreadyUsed;
  const phasesRemaining = maxPhases - phasesAlreadyUsed;

  const form = useForm<FreezeRequestInput>({
    resolver: zodResolver(FreezeRequestSchema),
    defaultValues: {
      membershipId,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      reason: "",
    },
  });

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (e < s) return 0;
    return inclusiveDays(s, e);
  }, [startDate, endDate]);

  const overLimit = days > remaining;

  function onSubmit(values: FreezeRequestInput) {
    startTransition(async () => {
      const result = await requestFreezeAction(values);
      if (result.ok) {
        toast.success("Freeze request submitted. Awaiting admin approval.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (phasesRemaining <= 0) {
    return (
      <Button disabled variant="outline" size="sm">
        <Snowflake className="h-4 w-4" /> No freeze phases left
      </Button>
    );
  }
  if (remaining <= 0) {
    return (
      <Button disabled variant="outline" size="sm">
        <Snowflake className="h-4 w-4" /> Freeze limit reached
      </Button>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Snowflake className="h-4 w-4" /> Request freeze
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Request membership freeze</AlertDialogTitle>
          <AlertDialogDescription>
            {daysAlreadyUsed > 0 ? (
              <>
                Already used <strong>{daysAlreadyUsed}d</strong> across{" "}
                <strong>{phasesAlreadyUsed}</strong> phase
                {phasesAlreadyUsed === 1 ? "" : "s"}. Up to <strong>{remaining}d</strong> and{" "}
                <strong>{phasesRemaining}</strong> phase{phasesRemaining === 1 ? "" : "s"} remaining.
              </>
            ) : (
              <>Maximum {maxDays} days across up to {maxPhases} phases per membership.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start *</FormLabel>
                    <FormControl><Input {...field} type="date" disabled={pending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End *</FormLabel>
                    <FormControl><Input {...field} type="date" disabled={pending} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
              {days > 0 ? (
                <span className={overLimit ? "text-destructive" : ""}>
                  {days} day{days === 1 ? "" : "s"}
                  {overLimit && ` — exceeds ${remaining}d remaining`}
                </span>
              ) : (
                <span className="text-muted-foreground">Pick dates to see total days</span>
              )}
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason *</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} disabled={pending} placeholder="Vacation, injury recovery, etc." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                type="submit"
                disabled={pending || overLimit || days <= 0}
                onClick={(e) => {
                  e.preventDefault();
                  form.handleSubmit(onSubmit)();
                }}
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit request
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
