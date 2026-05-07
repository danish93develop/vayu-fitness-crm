"use client";

import { useLinkStatus } from "next/link";
import { ArrowUpRight, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Body of a Quick Action card. Lives as a Link child so it can use
 * useLinkStatus() to swap the icon for a spinner the moment the user clicks.
 */
export function QuickActionContent({
  icon: Icon,
  label,
  hint,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  tone: string;
}) {
  const { pending } = useLinkStatus();

  return (
    <>
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          tone,
        )}
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">
          {pending ? "Loading…" : label}
        </div>
        <div className="truncate text-xs text-muted-foreground">{hint}</div>
      </div>
      <ArrowUpRight
        className={cn(
          "h-4 w-4 text-muted-foreground transition-all",
          pending
            ? "opacity-0"
            : "opacity-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100",
        )}
      />
    </>
  );
}
