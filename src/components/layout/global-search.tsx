"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, CreditCard, Receipt, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { AvatarCell } from "@/components/tables/avatar-cell";
import { globalSearchAction, type SearchResult } from "@/server/actions/search";
import { formatPaiseShort } from "@/lib/money";
import { cn } from "@/lib/utils";

type FlatItem = {
  type: "member" | "lead" | "payment" | "invoice";
  href: string;
  /** Use either avatar (for people) or icon (for transactions) */
  avatar?: { name: string; seed: string };
  icon?: LucideIcon;
  primary: string;
  secondary: string;
  trailing?: React.ReactNode;
};

const EMPTY: SearchResult = {
  members: [],
  leads: [],
  payments: [],
  invoices: [],
  totalMatches: 0,
};

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>(EMPTY);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Cmd+K / Ctrl+K to focus
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(EMPTY);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const r = await globalSearchAction(query);
      setResults(r);
      setActiveIndex(0);
      setSearching(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Flatten for keyboard nav
  const flat: FlatItem[] = useMemo(() => {
    const items: FlatItem[] = [];
    for (const m of results.members) {
      items.push({
        type: "member",
        href: `/members/${m.id}`,
        avatar: { name: m.fullName, seed: m.memberCode },
        primary: m.fullName,
        secondary: `${m.memberCode} · ${m.phone}`,
        trailing: <StatusBadge status={m.status} size="sm" />,
      });
    }
    for (const l of results.leads) {
      items.push({
        type: "lead",
        href: `/leads/${l.id}`,
        avatar: { name: l.name, seed: l.id },
        primary: l.name,
        secondary: l.phone,
        trailing: <StatusBadge status={l.status} size="sm" />,
      });
    }
    for (const p of results.payments) {
      items.push({
        type: "payment",
        href: `/payments/${p.id}`,
        icon: CreditCard,
        primary: p.paymentCode,
        secondary: p.memberName,
        trailing: (
          <span className="text-xs font-semibold tabular-nums">
            {formatPaiseShort(p.totalPaise)}
          </span>
        ),
      });
    }
    for (const i of results.invoices) {
      items.push({
        type: "invoice",
        href: `/invoices/${i.id}`,
        icon: Receipt,
        primary: i.invoiceNumber,
        secondary: i.memberName,
        trailing: (
          <span className="text-xs font-semibold tabular-nums">
            {formatPaiseShort(i.totalPaise)}
          </span>
        ),
      });
    }
    return items;
  }, [results]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setQuery("");
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!flat.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[activeIndex];
      if (item) {
        router.push(item.href as never);
        setOpen(false);
        setQuery("");
      }
    }
  }

  function handleClickItem(href: string) {
    router.push(href as never);
    setOpen(false);
    setQuery("");
  }

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search members, leads, payments, invoices…"
        className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-20 text-sm outline-none ring-ring/40 transition focus:ring-2"
        autoComplete="off"
      />
      {/* Right-side hint / clear button */}
      {query ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Clear"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          {searching && flat.length === 0 ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : flat.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No results for &ldquo;<span className="font-medium text-foreground">{query}</span>&rdquo;
            </div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto py-1">
              {/* Members */}
              {results.members.length > 0 && (
                <Group title="Members" count={results.members.length}>
                  {flat
                    .map((item, index) => ({ item, index }))
                    .filter((x) => x.item.type === "member")
                    .map(({ item, index }) => (
                      <ResultRow
                        key={item.href}
                        item={item}
                        active={activeIndex === index}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => handleClickItem(item.href)}
                      />
                    ))}
                </Group>
              )}
              {/* Leads */}
              {results.leads.length > 0 && (
                <Group title="Leads" count={results.leads.length}>
                  {flat
                    .map((item, index) => ({ item, index }))
                    .filter((x) => x.item.type === "lead")
                    .map(({ item, index }) => (
                      <ResultRow
                        key={item.href}
                        item={item}
                        active={activeIndex === index}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => handleClickItem(item.href)}
                      />
                    ))}
                </Group>
              )}
              {/* Payments */}
              {results.payments.length > 0 && (
                <Group title="Payments" count={results.payments.length}>
                  {flat
                    .map((item, index) => ({ item, index }))
                    .filter((x) => x.item.type === "payment")
                    .map(({ item, index }) => (
                      <ResultRow
                        key={item.href}
                        item={item}
                        active={activeIndex === index}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => handleClickItem(item.href)}
                      />
                    ))}
                </Group>
              )}
              {/* Invoices */}
              {results.invoices.length > 0 && (
                <Group title="Invoices" count={results.invoices.length}>
                  {flat
                    .map((item, index) => ({ item, index }))
                    .filter((x) => x.item.type === "invoice")
                    .map(({ item, index }) => (
                      <ResultRow
                        key={item.href}
                        item={item}
                        active={activeIndex === index}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => handleClickItem(item.href)}
                      />
                    ))}
                </Group>
              )}
            </div>
          )}

          {/* Footer hint */}
          {flat.length > 0 && (
            <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
              <span>
                {results.totalMatches} result{results.totalMatches === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-3">
                <Hint>↑↓</Hint> to navigate <Hint>↵</Hint> open <Hint>esc</Hint> close
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-3 pb-1 pt-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <span className="text-[10px] text-muted-foreground">{count}</span>
      </div>
      <ul>{children}</ul>
    </div>
  );
}

function ResultRow({
  item,
  active,
  onMouseEnter,
  onClick,
}: {
  item: FlatItem;
  active: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onMouseEnter={onMouseEnter}
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
          active && "bg-muted",
        )}
      >
        {item.avatar ? (
          <AvatarCell name={item.avatar.name} seed={item.avatar.seed} size="sm" />
        ) : item.icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <item.icon className="h-4 w-4" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{item.primary}</div>
          <div className="truncate text-xs text-muted-foreground">{item.secondary}</div>
        </div>
        {item.trailing && <div className="shrink-0">{item.trailing}</div>}
      </button>
    </li>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-card px-1 py-px font-mono text-[9px]">
      {children}
    </kbd>
  );
}
