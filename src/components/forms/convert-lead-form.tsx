"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ConvertLeadSchema, type ConvertLeadInput } from "@/lib/validations/lead";
import { convertLeadAction } from "@/server/actions/leads";

type Trainer = { id: string; name: string };

export function ConvertLeadForm({
  leadId,
  trainers,
}: {
  leadId: string;
  trainers: Trainer[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<ConvertLeadInput>({
    resolver: zodResolver(ConvertLeadSchema),
    defaultValues: {
      joiningDate: new Date().toISOString().slice(0, 10),
      assignedTrainerId: "",
    },
  });

  function onSubmit(values: ConvertLeadInput) {
    startTransition(async () => {
      const result = await convertLeadAction(leadId, values);
      if (result.ok) {
        toast.success("Lead converted to member.");
        setOpen(false);
        router.push(`/members/${result.data.memberId}` as never);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button>
          <UserCheck className="h-4 w-4" />
          Convert to member
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Convert lead to member</AlertDialogTitle>
          <AlertDialogDescription>
            This creates a new member record using the lead&apos;s details. The lead will be marked
            as Converted. You can assign a plan and take payment after the member is created.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="joiningDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Joining date *</FormLabel>
                  <FormControl><Input {...field} type="date" disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignedTrainerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign trainer (optional)</FormLabel>
                  <Select
                    value={field.value || "_none"}
                    onValueChange={(v) => field.onChange(v === "_none" ? "" : v)}
                    disabled={pending}
                  >
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      {trainers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                type="submit"
                disabled={pending}
                onClick={(e) => {
                  e.preventDefault();
                  form.handleSubmit(onSubmit)();
                }}
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Convert
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
