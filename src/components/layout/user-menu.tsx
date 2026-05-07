"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User, UserCog } from "lucide-react";
import { logoutAction } from "@/server/actions/auth";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  email: string;
  role: string;
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  RECEPTIONIST: "Receptionist",
  ACCOUNTANT: "Accountant",
  TRAINER: "Trainer",
  MEMBER: "Member",
};

export function UserMenu({ name, email, role }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  function handleLogout() {
    startTransition(async () => {
      await logoutAction();
      router.refresh();
    });
  }

  // Click-outside to close
  if (typeof window !== "undefined") {
    if (open) {
      setTimeout(() => {
        const handler = (e: MouseEvent) => {
          if (ref.current && !ref.current.contains(e.target as Node)) {
            setOpen(false);
            window.removeEventListener("click", handler);
          }
        };
        window.addEventListener("click", handler, { once: true });
      }, 0);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted",
          open && "bg-muted",
        )}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
          <User className="h-4 w-4 text-foreground" />
        </div>
        <div className="text-left leading-tight">
          <div className="text-xs font-medium">{name}</div>
          <div className="text-[10px] text-muted-foreground">
            {ROLE_LABELS[role] ?? role}
          </div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border border-border bg-card p-2 shadow-md">
          <div className="px-2 py-2 text-xs">
            <div className="font-medium">{name}</div>
            <div className="truncate text-muted-foreground">{email}</div>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link
            href={"/profile" as never}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <UserCog className="h-4 w-4" />
            Your profile
          </Link>
          <div className="my-1 h-px bg-border" />
          <div className="px-2 py-2">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Theme
            </div>
            <ThemeToggle />
          </div>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={handleLogout}
            disabled={pending}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
