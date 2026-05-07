"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CalendarDays } from "lucide-react";
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
import { ClassSchema, type ClassInput } from "@/lib/validations/class";
import { createClassAction, updateClassAction } from "@/server/actions/classes";

type Trainer = { id: string; name: string; specialization?: string | null };

type Props = {
  mode: "create" | "edit";
  trainers: Trainer[];
  defaultValues?: Partial<ClassInput>;
  classId?: string;
};

export function ClassForm({ mode, trainers, defaultValues, classId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<ClassInput>({
    resolver: zodResolver(ClassSchema),
    defaultValues: {
      name: "",
      trainerId: "",
      date: new Date().toISOString().slice(0, 10),
      startTime: "07:00",
      endTime: "08:00",
      capacity: 20,
      status: "SCHEDULED",
      notes: "",
      ...defaultValues,
    },
  });

  function onSubmit(values: ClassInput) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createClassAction(values)
          : await updateClassAction(classId!, values);

      if (result.ok) {
        toast.success(mode === "create" ? "Class created." : "Class updated.");
        router.push("/classes" as never);
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
          variant="sky"
          icon={CalendarDays}
          title="Class schedule"
          description="A single class session — name, trainer, date, time, capacity. Booking and waitlists are out of MVP scope; this is just the schedule."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class name *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={pending} placeholder="Yoga, Zumba, Strength, CrossFit…" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="trainerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trainer</FormLabel>
                  <Select
                    value={field.value || "_none"}
                    onValueChange={(v) => field.onChange(v === "_none" ? "" : v)}
                    disabled={pending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No trainer assigned" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">No trainer</SelectItem>
                      {trainers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                          {t.specialization ? ` · ${t.specialization}` : ""}
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
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl><Input {...field} type="date" disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity *</FormLabel>
                  <FormControl><Input {...field} type="number" min={1} max={500} disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start time *</FormLabel>
                  <FormControl><Input {...field} type="time" disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End time *</FormLabel>
                  <FormControl><Input {...field} type="time" disabled={pending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={pending}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                      <SelectItem value="ONGOING">Ongoing</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
            <Link href={"/classes" as never}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "create" ? "Create class" : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
