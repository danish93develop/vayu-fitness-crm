"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Copy, Check, Loader2 } from "lucide-react";
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
  RequestResetSchema,
  type RequestResetInput,
} from "@/lib/validations/password-reset";
import { requestPasswordResetAction } from "@/server/actions/password-reset";

type Issued = { token: string | null; expiresAt: Date; email: string } | null;

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [issued, setIssued] = useState<Issued>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<RequestResetInput>({
    resolver: zodResolver(RequestResetSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: RequestResetInput) {
    startTransition(async () => {
      const result = await requestPasswordResetAction(values);
      if (result.ok) {
        setIssued({ ...result.data, email: values.email });
      } else {
        toast.error(result.error);
      }
    });
  }

  // Always show success even if no token was issued — prevents email enumeration
  if (issued) {
    const link = issued.token
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/reset-password/${issued.token}`
      : null;

    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <p className="font-medium text-emerald-800 dark:text-emerald-200">Reset link generated.</p>
          <p className="mt-1 text-emerald-700 dark:text-emerald-300">
            If <span className="font-mono">{issued.email}</span> is a registered account, a
            reset link has been issued. The link expires in 24 hours and can only be used once.
          </p>
        </div>

        {link && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              <strong>Admin only:</strong> Since email isn&apos;t configured yet, copy this link
              and share it with the user securely (WhatsApp, in person, etc.).
            </p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
              <code className="flex-1 truncate font-mono text-xs">{link}</code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(link);
                  setCopied(true);
                  toast.success("Link copied to clipboard.");
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        )}

        <div className="text-center text-sm">
          <Link href={"/login" as never} className="text-accent hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="you@gym.com" disabled={pending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Send reset link
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
