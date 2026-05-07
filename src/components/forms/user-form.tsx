"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, UserCircle, ShieldCheck, KeyRound } from "lucide-react";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SettingsSection } from "./settings-section";
import {
  UserCreateSchema,
  UserUpdateSchema,
  type UserCreateInput,
  type UserUpdateInput,
} from "@/lib/validations/user";
import { createUserAction, updateUserAction } from "@/server/actions/users";
import type { UserRoleType } from "@prisma/client";

const ROLE_OPTIONS: { value: UserRoleType; label: string; description: string }[] = [
  { value: "SUPER_ADMIN", label: "Super Admin", description: "Full access — including users, settings, audit logs" },
  { value: "ADMIN", label: "Admin", description: "Full gym ops, staff, members, payments, reports" },
  { value: "MANAGER", label: "Manager", description: "Daily ops, freezes, limited discounts" },
  { value: "RECEPTIONIST", label: "Receptionist", description: "Front desk, members, leads, attendance, payments (no discounts)" },
  { value: "ACCOUNTANT", label: "Accountant", description: "Payments + invoices view-only, reports + exports" },
  { value: "TRAINER", label: "Trainer", description: "Assigned members + classes view-only" },
];

type Props =
  | {
      mode: "create";
      defaultValues?: Partial<UserCreateInput>;
      userId?: never;
      isSelf?: never;
    }
  | {
      mode: "edit";
      defaultValues: Partial<UserUpdateInput>;
      userId: string;
      isSelf: boolean;
    };

export function UserForm(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const isCreate = props.mode === "create";
  const schema = isCreate ? UserCreateSchema : UserUpdateSchema;

  const form = useForm<UserCreateInput | UserUpdateInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "RECEPTIONIST",
      isActive: true,
      password: "",
      ...props.defaultValues,
    },
  });

  function onSubmit(values: UserCreateInput | UserUpdateInput) {
    startTransition(async () => {
      const result = isCreate
        ? await createUserAction(values as UserCreateInput)
        : await updateUserAction(props.userId!, values as UserUpdateInput);

      if (result.ok) {
        toast.success(isCreate ? "Staff account created." : "Staff account updated.");
        router.push("/users" as never);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const isSelf = !isCreate && props.isSelf;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <SettingsSection
          number={1}
          variant="emerald"
          icon={UserCircle}
          title="Personal details"
          description="The basics. Email is used to sign in — make sure it's correct."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name *</FormLabel>
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
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" disabled={pending} autoComplete="off" />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Used to sign in.</p>
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
          </div>
        </SettingsSection>

        <SettingsSection
          number={2}
          variant="sky"
          icon={ShieldCheck}
          title="Access &amp; role"
          description="What this user can see and do across the system. Inactive users can't sign in even if their password is correct."
        >
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role *</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={pending || isSelf}
                >
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{r.label}</span>
                          <span className="text-xs text-muted-foreground">{r.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isSelf && (
                  <p className="text-xs text-muted-foreground">
                    You can&apos;t change your own role.
                  </p>
                )}
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
                  disabled={pending || isSelf}
                >
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active — can sign in</SelectItem>
                    <SelectItem value="inactive">Inactive — login blocked</SelectItem>
                  </SelectContent>
                </Select>
                {isSelf && (
                  <p className="text-xs text-muted-foreground">
                    You can&apos;t deactivate your own account.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsSection>

        <SettingsSection
          number={3}
          variant="amber"
          icon={KeyRound}
          title="Password"
          description={
            isCreate
              ? "Set the user's initial password. Share it with them through a secure channel — they can change it after signing in (in a future release)."
              : "Leave blank to keep the current password unchanged. To force a reset, type a new password — the user will be unlocked too."
          }
        >
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isCreate ? "Password *" : "New password"}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      disabled={pending}
                      autoComplete="new-password"
                      placeholder={isCreate ? "" : "Leave blank to keep existing"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      tabIndex={-1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  At least 8 characters with a letter and a number.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsSection>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" asChild disabled={pending}>
            <Link href={"/users" as never}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isCreate ? "Create account" : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
