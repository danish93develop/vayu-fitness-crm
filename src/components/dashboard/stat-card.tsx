import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "accent" | "warn" | "danger" | "muted";

const TONE_BG: Record<Tone, string> = {
  primary: "bg-gradient-primary text-[hsl(222,47%,11%)]",
  accent: "bg-accent/15 text-accent",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  danger: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

type Props = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  /** When true, the value renders with the brand gradient (use sparingly — for headline numbers) */
  highlight?: boolean;
};

export function StatCard({ label, value, icon: Icon, tone = "primary", hint, highlight }: Props) {
  return (
    <div className="ring-gradient-primary group relative rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-glow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div
            className={cn(
              "mt-2 text-2xl font-bold tabular-nums",
              highlight && "text-gradient-primary",
            )}
          >
            {value}
          </div>
          {hint && <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className={cn("shrink-0 rounded-lg p-2 shadow-sm", TONE_BG[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
