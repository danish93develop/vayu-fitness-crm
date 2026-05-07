import { Dumbbell } from "lucide-react";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";
import { BRAND } from "@/constants/brand";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary text-[hsl(222,47%,11%)] shadow-glow">
            <Dumbbell className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-gradient-primary">{BRAND.name}</span>
          </h1>
        </div>

        <div className="rounded-2xl border border-white/40 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-card/80">
          <h2 className="mb-1 text-lg font-semibold">Forgot your password?</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Enter your email and we&apos;ll generate a one-time reset link.
          </p>
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
