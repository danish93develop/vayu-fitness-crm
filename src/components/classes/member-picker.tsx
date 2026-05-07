"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AvatarCell } from "@/components/tables/avatar-cell";
import { searchMembersForBooking } from "@/server/actions/class-search";
import { bookClassAction } from "@/server/actions/class-bookings";
import type { MemberStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

type Member = {
  id: string;
  fullName: string;
  memberCode: string;
  phone: string;
  status: MemberStatus;
  profilePhotoUrl: string | null;
};

type Props = {
  classId: string;
  /** When the class is full or cancelled, the form goes read-only. */
  disabled: boolean;
  disabledReason?: string;
  onBooked?: () => void;
};

/**
 * A search-as-you-type member picker. Picks the first match if the user
 * presses Enter, lets them browse a dropdown otherwise. Submission books
 * the chosen member; the picker resets so staff can keep adding.
 */
export function MemberPicker({ classId, disabled, disabledReason, onBooked }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [searching, setSearching] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Debounced search
  useEffect(() => {
    if (selected) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const result = await searchMembersForBooking(classId, trimmed);
        if (result.ok) setResults(result.data);
        else setResults([]);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, classId, selected]);

  // Click-outside closes the dropdown
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function pick(m: Member) {
    setSelected(m);
    setQuery(`${m.fullName} (${m.memberCode})`);
    setResults([]);
    setOpen(false);
  }

  function clearPick() {
    setSelected(null);
    setQuery("");
    setResults([]);
  }

  function submit() {
    if (!selected) {
      toast.error("Pick a member first.");
      return;
    }
    startTransition(async () => {
      const result = await bookClassAction({
        classId,
        memberId: selected.id,
        notes: "",
      });
      if (result.ok) {
        toast.success(`${selected.fullName} booked.`);
        clearPick();
        onBooked?.();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div ref={wrapRef} className="relative">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={query}
            placeholder={
              disabled
                ? disabledReason ?? "Booking unavailable"
                : "Search by name, phone, or code…"
            }
            disabled={disabled || pending}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (results[0] && !selected) pick(results[0]);
                else if (selected) submit();
              }
            }}
            className="pl-9 pr-9"
          />
          {selected && (
            <button
              type="button"
              onClick={clearPick}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && !selected && query.trim().length >= 2 && (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-lg">
            {searching ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching…
              </div>
            ) : results.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                No matching members. They may already be booked.
              </div>
            ) : (
              <ul className="max-h-72 divide-y divide-border/60 overflow-y-auto">
                {results.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => pick(m)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/60",
                      )}
                    >
                      <AvatarCell
                        name={m.fullName}
                        seed={m.id}
                        photoUrl={m.profilePhotoUrl}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{m.fullName}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          <span className="font-mono">{m.memberCode}</span> · {m.phone}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {selected
            ? `Press “Book” or hit Enter to confirm.`
            : `Type at least 2 characters to search.`}
        </p>
        <Button type="button" onClick={submit} disabled={!selected || disabled || pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Book
        </Button>
      </div>
    </div>
  );
}
