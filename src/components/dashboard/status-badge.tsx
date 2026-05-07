import { cn } from "@/lib/utils";
import type {
  MemberStatus,
  MembershipStatus,
  LeadStatus,
  PaymentStatus,
  InstallmentStatus,
  ClassStatus,
  FreezeStatus,
} from "@prisma/client";

type AnyStatus =
  | MemberStatus
  | MembershipStatus
  | LeadStatus
  | PaymentStatus
  | InstallmentStatus
  | ClassStatus
  | FreezeStatus
  | string;

/**
 * Modern status badge: soft tinted background + tiny colored dot indicator
 * + matching text + subtle inset ring. Used by Linear, Stripe, Vercel —
 * reads cleanly at any size, holds up against gradients and dark sidebars.
 */
type StyleConfig = {
  /** Body text + bg + ring (Tailwind classes) */
  body: string;
  /** Dot color (Tailwind class) */
  dot: string;
  /** Optional pulse animation on the dot */
  pulse?: boolean;
};

// Tailwind shorthand sets used across status types — opacity-based bg works
// in both light and dark mode; dark: text variants ensure contrast.
const TONE = {
  emerald:
    "bg-emerald-500/10 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber:
    "bg-amber-500/15 text-amber-700 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300",
  rose:
    "bg-rose-500/10 text-rose-700 ring-rose-600/15 dark:bg-rose-500/15 dark:text-rose-300",
  sky:
    "bg-sky-500/10 text-sky-700 ring-sky-600/15 dark:bg-sky-500/15 dark:text-sky-300",
  slate:
    "bg-slate-500/10 text-slate-600 ring-slate-500/15 dark:bg-slate-500/15 dark:text-slate-300",
  violet:
    "bg-violet-500/10 text-violet-700 ring-violet-600/15 dark:bg-violet-500/15 dark:text-violet-300",
  lime:
    "bg-lime-500/15 text-lime-800 ring-lime-600/20 dark:bg-lime-500/15 dark:text-lime-300",
  indigo:
    "bg-indigo-500/10 text-indigo-700 ring-indigo-600/15 dark:bg-indigo-500/15 dark:text-indigo-300",
} as const;

const STYLE: Record<string, StyleConfig> = {
  // === Member / Membership statuses ===
  ACTIVE: { body: TONE.emerald, dot: "bg-emerald-500", pulse: true },
  EXPIRING_SOON: { body: TONE.amber, dot: "bg-amber-500" },
  EXPIRED: { body: TONE.rose, dot: "bg-rose-500" },
  FROZEN: { body: TONE.sky, dot: "bg-sky-500" },
  CANCELLED: { body: TONE.slate, dot: "bg-slate-400" },
  PENDING_PAYMENT: { body: TONE.amber, dot: "bg-amber-500" },
  INACTIVE: { body: TONE.slate, dot: "bg-slate-400" },

  // === Payment / Installment statuses ===
  PAID: { body: TONE.emerald, dot: "bg-emerald-500" },
  PARTIAL: { body: TONE.amber, dot: "bg-amber-500" },
  PENDING: { body: TONE.amber, dot: "bg-amber-500" },
  FAILED: { body: TONE.rose, dot: "bg-rose-500" },
  REFUNDED: { body: TONE.violet, dot: "bg-violet-500" },
  VOID: { body: TONE.slate, dot: "bg-slate-400" },
  OVERDUE: { body: TONE.rose, dot: "bg-rose-500", pulse: true },

  // === Lead statuses ===
  NEW: { body: TONE.lime, dot: "bg-lime-500" },
  CONTACTED: { body: TONE.sky, dot: "bg-sky-500" },
  TRIAL_BOOKED: { body: TONE.indigo, dot: "bg-indigo-500" },
  TRIAL_COMPLETED: { body: TONE.violet, dot: "bg-violet-500" },
  CONVERTED: { body: TONE.emerald, dot: "bg-emerald-500" },
  LOST: { body: TONE.slate, dot: "bg-slate-400" },

  // === Class statuses ===
  SCHEDULED: { body: TONE.sky, dot: "bg-sky-500" },
  ONGOING: { body: TONE.emerald, dot: "bg-emerald-500", pulse: true },
  COMPLETED: { body: TONE.slate, dot: "bg-slate-500" },

  // === Freeze statuses ===
  APPROVED: { body: TONE.emerald, dot: "bg-emerald-500" },
  REJECTED: { body: TONE.rose, dot: "bg-rose-500" },
};

const LABEL: Record<string, string> = {
  EXPIRING_SOON: "Expiring",
  PENDING_PAYMENT: "Pending",
  TRIAL_BOOKED: "Trial booked",
  TRIAL_COMPLETED: "Trial done",
  BANK_TRANSFER: "Bank",
  WALK_IN: "Walk-in",
};

export function StatusBadge({
  status,
  size = "default",
}: {
  status: AnyStatus;
  size?: "sm" | "default";
}) {
  const config = STYLE[status as string] ?? {
    body: "bg-slate-100 text-slate-700 ring-slate-500/15",
    dot: "bg-slate-400",
  };
  const label = LABEL[status as string] ?? humanize(status as string);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium ring-1 ring-inset",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        config.body,
      )}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {config.pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
              config.dot,
            )}
          />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", config.dot)} />
      </span>
      {label}
    </span>
  );
}

function humanize(s: string) {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
