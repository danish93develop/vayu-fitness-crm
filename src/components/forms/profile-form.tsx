"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, UserCircle, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ProfileUpdateSchema,
  ChangePasswordSchema,
  type ProfileUpdateInput,
  type ChangePasswordInput,
} from "@/lib/validations/profile";
import {
  updateProfileAction,
  changeOwnPasswordAction,
} from "@/server/actions/profile";

type Props = {
  defaultValues: ProfileUpdateInput;
};

export function ProfileForm({ defaultValues }: Props) {
  return (
    <div className="space-y-8">
      <ProfileDetailsForm defaultValues={defaultValues} />
      <PasswordChangeForm />
    </div>
  );
}

function ProfileDetailsForm({ defaultValues }: { defaultValues: ProfileUpdateInput }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<ProfileUpdateInput>({
    resolver: zodResolver(ProfileUpdateSchema),
    defaultValues,
  });

  function onSubmit(values: ProfileUpdateInput) {
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (result.ok) {
        toast.success("Profile updated.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <SettingsSection
          number={1}
          variant="emerald"
          icon={UserCircle}
          title="Personal details"
          description="Your name and phone number are visible to teammates. Email is locked here — ask an admin if you need to change it."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={pending} />
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
                  <FormControl>
                    <Input {...field} disabled={pending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex items-center justify-end pt-2">
            <Button type="submit" disabled={pending || !form.formState.isDirty}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </SettingsSection>
      </form>
    </Form>
  );
}

function PasswordChangeForm() {
  const [pending, startTransition] = useTransition();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: "",
      password: "",
      confirmPassword: "",
    },
  });

  function onSubmit(values: ChangePasswordInput) {
    startTransition(async () => {
      const result = await changeOwnPasswordAction(values);
      if (result.ok) {
        toast.success("Password changed.");
        form.reset({
          currentPassword: "",
          password: "",
          confirmPassword: "",
        });
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <SettingsSection
          number={2}
          variant="amber"
          icon={KeyRound}
          title="Change password"
          description="You'll need to enter your current password to confirm the change. Pick something with at least 8 characters, including a letter and a number."
        >
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current password *</FormLabel>
                <FormControl>
                  <PasswordInput
                    field={field}
                    show={showCurrent}
                    onToggle={() => setShowCurrent((s) => !s)}
                    disabled={pending}
                    autoComplete="current-password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password *</FormLabel>
                  <FormControl>
                    <PasswordInput
                      field={field}
                      show={showNew}
                      onToggle={() => setShowNew((s) => !s)}
                      disabled={pending}
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    8+ characters with a letter and a number.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password *</FormLabel>
                  <FormControl>
                    <PasswordInput
                      field={field}
                      show={showConfirm}
                      onToggle={() => setShowConfirm((s) => !s)}
                      disabled={pending}
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex items-center justify-end pt-2">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </div>
        </SettingsSection>
      </form>
    </Form>
  );
}

type FieldProps = {
  field: {
    value: string;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    onBlur: () => void;
    name: string;
    ref: React.Ref<HTMLInputElement>;
  };
  show: boolean;
  onToggle: () => void;
  disabled: boolean;
  autoComplete: string;
};

function PasswordInput({ field, show, onToggle, disabled, autoComplete }: FieldProps) {
  return (
    <div className="relative">
      <Input
        {...field}
        type={show ? "text" : "password"}
        disabled={disabled}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={onToggle}
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
