"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { FollowUpSchema, type FollowUpInput } from "@/lib/validations/lead";
import { addFollowUpAction } from "@/server/actions/leads";

export function FollowUpForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<FollowUpInput>({
    resolver: zodResolver(FollowUpSchema),
    defaultValues: { note: "", nextFollowUpDate: "" },
  });

  function onSubmit(values: FollowUpInput) {
    startTransition(async () => {
      const result = await addFollowUpAction(leadId, values);
      if (result.ok) {
        toast.success("Follow-up added.");
        form.reset({ note: "", nextFollowUpDate: "" });
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Add follow-up note</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} disabled={pending} placeholder="Spoke with member, prefers evening trial…" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-end gap-3">
          <FormField
            control={form.control}
            name="nextFollowUpDate"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Next follow-up</FormLabel>
                <FormControl>
                  <Input {...field} type="date" disabled={pending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add note
          </Button>
        </div>
      </form>
    </Form>
  );
}
