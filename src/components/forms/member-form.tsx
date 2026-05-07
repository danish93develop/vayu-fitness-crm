"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserCircle, ShieldAlert, Sparkles } from "lucide-react";
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
import { MemberSchema, type MemberInput } from "@/lib/validations/member";
import { createMemberAction, updateMemberAction } from "@/server/actions/members";

type Trainer = { id: string; name: string; specialization?: string | null };

type Props = {
  mode: "create" | "edit";
  trainers: Trainer[];
  defaultValues?: Partial<MemberInput>;
  memberId?: string;
};

export function MemberForm({ mode, trainers, defaultValues, memberId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<MemberInput>({
    resolver: zodResolver(MemberSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      gender: "UNSPECIFIED",
      dateOfBirth: "",
      address: "",
      emergencyName: "",
      emergencyPhone: "",
      joiningDate: new Date().toISOString().slice(0, 10),
      assignedTrainerId: "",
      notes: "",
      ...defaultValues,
    },
  });

  // Live preview values
  const fullName = form.watch("fullName");
  const phone = form.watch("phone");
  const initials = (fullName || "?")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function onSubmit(values: MemberInput) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createMemberAction(values)
          : await updateMemberAction(memberId!, values);

      if (result.ok) {
        toast.success(mode === "create" ? "Member created." : "Member updated.");
        if (mode === "create" && "data" in result) {
          router.push(`/members/${result.data.id}` as never);
        } else {
          router.push(`/members/${memberId}` as never);
          router.refresh();
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* ── Personal details ─────────────────────────────────────────── */}
        <SettingsSection
          number={1}
          variant="emerald"
          icon={UserCircle}
          title="Personal details"
          description="The basics that show up on the member's profile and on every invoice we send."
        >
          {/* Live preview card */}
          <div className="overflow-hidden rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-sm font-bold text-[hsl(222,47%,11%)] shadow-glow-sm">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {fullName || "New member"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {phone || "Phone not set"}
                </div>
              </div>
              <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Live preview
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={pending} placeholder="Aarav Mehta" />
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
                  <FormLabel>Phone *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={pending} placeholder="+91 9810000000" />
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
                    <Input
                      {...field}
                      disabled={pending}
                      type="email"
                      placeholder="aarav@example.com"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={pending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="UNSPECIFIED">Prefer not to say</SelectItem>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of birth</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" disabled={pending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="joiningDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Joining date *</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" disabled={pending} />
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
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Textarea {...field} disabled={pending} rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsSection>

        {/* ── Emergency contact ────────────────────────────────────────── */}
        <SettingsSection
          number={2}
          variant="rose"
          icon={ShieldAlert}
          title="Emergency contact"
          description="Used by staff if there's an injury, fainting episode, or other health emergency during a workout."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="emergencyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={pending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emergencyPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={pending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </SettingsSection>

        {/* ── Other ────────────────────────────────────────────────────── */}
        <SettingsSection
          number={3}
          variant="sky"
          icon={Sparkles}
          title="Trainer &amp; notes"
          description="Optional metadata. The assigned trainer shows up on the member's profile, and notes are visible to staff but never to the member."
        >
          <FormField
            control={form.control}
            name="assignedTrainerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned trainer</FormLabel>
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
                    <SelectItem value="_none">No trainer assigned</SelectItem>
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
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Internal notes</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    disabled={pending}
                    rows={3}
                    placeholder="Allergies, training preferences, medical considerations…"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsSection>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" asChild disabled={pending}>
            <Link href={(memberId ? `/members/${memberId}` : "/members") as never}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "create" ? "Create member" : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
