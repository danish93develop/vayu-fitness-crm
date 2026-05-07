"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Dumbbell } from "lucide-react";
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
import { TrainerSchema, type TrainerInput } from "@/lib/validations/trainer";
import { createTrainerAction, updateTrainerAction } from "@/server/actions/trainers";

type Props = {
  mode: "create" | "edit";
  defaultValues?: Partial<TrainerInput>;
  trainerId?: string;
};

export function TrainerForm({ mode, defaultValues, trainerId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<TrainerInput>({
    resolver: zodResolver(TrainerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      specialization: "",
      bio: "",
      isActive: true,
      ...defaultValues,
    },
  });

  function onSubmit(values: TrainerInput) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createTrainerAction(values)
          : await updateTrainerAction(trainerId!, values);

      if (result.ok) {
        toast.success(mode === "create" ? "Trainer created." : "Trainer updated.");
        router.push("/trainers" as never);
        router.refresh();
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
          icon={Dumbbell}
          title="Trainer profile"
          description="Trainers can be assigned to members and shown on class schedules. They can optionally have their own login (set up later through the Users module)."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl><Input {...field} disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="specialization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specialization</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={pending} placeholder="Strength training, Yoga, etc." />
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
                  <FormControl><Input {...field} disabled={pending} /></FormControl>
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
                  <FormControl><Input {...field} type="email" disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
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
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl><Textarea {...field} rows={3} disabled={pending} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsSection>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" asChild disabled={pending}>
            <Link href={"/trainers" as never}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "create" ? "Create trainer" : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
