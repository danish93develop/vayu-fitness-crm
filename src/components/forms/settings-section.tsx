import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "emerald" | "sky" | "violet" | "amber" | "rose";

/**
 * Variant styles use opacity-based tints (e.g. emerald-500/10) which sit
 * cleanly on both light and dark backgrounds. Text uses explicit dark-mode
 * counterparts because foreground colors don't auto-flip with opacity.
 */
const VARIANT_STYLES: Record<
  Variant,
  {
    bg: string;
    badge: string;
    iconBg: string;
    blob: string;
    accent: string;
  }
> = {
  emerald: {
    bg: "from-emerald-500/[0.06] to-transparent",
    badge: "bg-emerald-500 text-white",
    iconBg:
      "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/30",
    blob: "bg-emerald-400 dark:bg-emerald-500",
    accent: "from-emerald-500 to-emerald-300",
  },
  sky: {
    bg: "from-sky-500/[0.06] to-transparent",
    badge: "bg-sky-500 text-white",
    iconBg: "bg-gradient-to-br from-sky-400 to-sky-600 text-white shadow-sky-500/30",
    blob: "bg-sky-400 dark:bg-sky-500",
    accent: "from-sky-500 to-sky-300",
  },
  violet: {
    bg: "from-violet-500/[0.06] to-transparent",
    badge: "bg-violet-500 text-white",
    iconBg:
      "bg-gradient-to-br from-violet-400 to-violet-600 text-white shadow-violet-500/30",
    blob: "bg-violet-400 dark:bg-violet-500",
    accent: "from-violet-500 to-violet-300",
  },
  amber: {
    bg: "from-amber-500/[0.06] to-transparent",
    badge: "bg-amber-500 text-white",
    iconBg:
      "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/30",
    blob: "bg-amber-400 dark:bg-amber-500",
    accent: "from-amber-500 to-amber-300",
  },
  rose: {
    bg: "from-rose-500/[0.06] to-transparent",
    badge: "bg-rose-500 text-white",
    iconBg: "bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-rose-500/30",
    blob: "bg-rose-400 dark:bg-rose-500",
    accent: "from-rose-500 to-rose-300",
  },
};

type Props = {
  number: number;
  variant: Variant;
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function SettingsSection({
  number,
  variant,
  icon: Icon,
  title,
  description,
  children,
}: Props) {
  const v = VARIANT_STYLES[variant];

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card bg-gradient-to-br p-6 sm:p-8",
        v.bg,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full opacity-20 blur-3xl",
          v.blob,
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 top-6 bottom-6 w-1 rounded-r bg-gradient-to-b",
          v.accent,
        )}
      />

      <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="mb-3 flex items-center gap-3">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-sm",
                v.badge,
              )}
            >
              {number}
            </span>
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl shadow-lg",
                v.iconBg,
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">{children}</div>
      </div>
    </section>
  );
}
