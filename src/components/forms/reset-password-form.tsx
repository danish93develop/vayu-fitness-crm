"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
import {
  PerformResetSchema,
  type PerformResetInput,
} from "@/lib/validations/password-reset";
import { performPasswordResetAction } from "@/server/actions/password-reset";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [show, setShow] = useState(false);

  const form = useForm<PerformResetInput>({
    resolver: zodResolver(PerformResetSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  function onSubmit(values: PerformResetInput) {
    startTransition(async () => {
      const result = await performPasswordResetAction(values);
      if (result.ok) {
        toast.success("Password reset. Sign in with your new password.");
        router.push("/login" as never);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    {...field}
                    type={show ? "text" : "password"}
                    disabled={pending}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm new password</FormLabel>
              <FormControl>
                <Input {...field} type={show ? "text" : "password"} disabled={pending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Reset password
        </Button>
        <p className="text-center text-sm">
          <Link href={"/login" as never} className="text-muted-foreground hover:text-foreground">
            Back to sign in
          </Link>
        </p>
      </form>
    </Form>
  );
}
