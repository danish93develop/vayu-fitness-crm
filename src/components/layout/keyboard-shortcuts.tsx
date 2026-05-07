"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Keyboard, X } from "lucide-react";

/**
 * Global keyboard shortcuts. Listens for sequences (`g m` for go to members)
 * and single-key shortcuts (`?` to open help, `n` to create).
 *
 * Shortcuts only fire when the user isn't typing in a field.
 */
const SHORTCUTS = [
  { keys: ["g", "d"], label: "Go to Dashboard", href: "/dashboard" },
  { keys: ["g", "m"], label: "Go to Members", href: "/members" },
  { keys: ["g", "l"], label: "Go to Leads", href: "/leads" },
  { keys: ["g", "p"], label: "Go to Plans", href: "/plans" },
  { keys: ["g", "y"], label: "Go to Payments", href: "/payments" },
  { keys: ["g", "i"], label: "Go to Invoices", href: "/invoices" },
  { keys: ["g", "a"], label: "Go to Attendance", href: "/attendance" },
  { keys: ["g", "t"], label: "Go to Trainers", href: "/trainers" },
  { keys: ["g", "c"], label: "Go to Classes", href: "/classes" },
  { keys: ["g", "r"], label: "Go to Reports", href: "/reports" },
  { keys: ["g", "s"], label: "Go to Settings", href: "/settings" },
  { keys: ["c", "m"], label: "Create new member", href: "/members/new" },
  { keys: ["c", "l"], label: "Create new lead", href: "/leads/new" },
  { keys: ["c", "p"], label: "Create new payment", href: "/payments/new" },
];

const SINGLE_KEYS = [
  { key: "?", label: "Show keyboard shortcuts" },
  { key: "⌘ + K", label: "Focus global search" },
];

const SEQUENCE_TIMEOUT = 800;

function isTyping(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    let buffer: string[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;

    function reset() {
      buffer = [];
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function handler(e: KeyboardEvent) {
      // Help overlay
      if (e.key === "?" && !isTyping(e.target) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setHelpOpen((o) => !o);
        return;
      }
      // Escape closes help
      if (e.key === "Escape" && helpOpen) {
        setHelpOpen(false);
        return;
      }

      if (isTyping(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (!/^[a-z]$/.test(key)) return;

      buffer.push(key);
      if (timer) clearTimeout(timer);
      timer = setTimeout(reset, SEQUENCE_TIMEOUT);

      // Try to match
      const match = SHORTCUTS.find(
        (s) => s.keys.length === buffer.length && s.keys.every((k, i) => k === buffer[i]),
      );
      if (match) {
        e.preventDefault();
        router.push(match.href as never);
        reset();
      }
    }

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      if (timer) clearTimeout(timer);
    };
  }, [router, helpOpen]);

  if (!helpOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={() => setHelpOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <Section title="Navigate">
            {SHORTCUTS.filter((s) => s.label.startsWith("Go to")).map((s) => (
              <Row key={s.label} keys={s.keys} label={s.label.replace("Go to ", "")} />
            ))}
          </Section>
          <Section title="Create">
            {SHORTCUTS.filter((s) => s.label.startsWith("Create")).map((s) => (
              <Row key={s.label} keys={s.keys} label={s.label} />
            ))}
          </Section>
          <Section title="Other">
            {SINGLE_KEYS.map((s) => (
              <Row key={s.label} keys={[s.key]} label={s.label} singleKey />
            ))}
          </Section>
        </div>

        <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          Press <Kbd>?</Kbd> any time to open this. <Kbd>esc</Kbd> to close.
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">{children}</ul>
    </div>
  );
}

function Row({
  keys,
  label,
  singleKey,
}: {
  keys: string[];
  label: string;
  singleKey?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="text-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <span key={i} className="flex items-center">
            {!singleKey && i > 0 && <span className="text-[10px] text-muted-foreground">then</span>}
            <Kbd>{k}</Kbd>
          </span>
        ))}
      </div>
    </li>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">
      {children}
    </kbd>
  );
}
