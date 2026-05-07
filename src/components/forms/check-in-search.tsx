"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  searchMembersForCheckInAction,
  checkInAction,
  type CheckInSearchResult,
} from "@/server/actions/attendance";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/date";

type Match = CheckInSearchResult;

export function CheckInSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Match[]>([]);
  const [searching, setSearching] = useState(false);
  const [, startTransition] = useTransition();
  const [pendingMember, setPendingMember] = useState<string | null>(null);

  // Debounced live search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const r = await searchMembersForCheckInAction(query);
      if (r.ok) setResults(r.data);
      setSearching(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  function handleCheckIn(member: Match) {
    setPendingMember(member.id);
    startTransition(async () => {
      const result = await checkInAction({ memberId: member.id });
      if (result.ok) {
        toast.success(
          `${member.fullName} checked in at ${formatTime(result.data.firstInAt)}`,
        );
        setQuery("");
        setResults([]);
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setPendingMember(null);
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, member code, or phone…"
          className="pl-9 pr-9"
          autoFocus
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results */}
      {query.trim().length >= 2 && (
        <div className="rounded-lg border border-border bg-card">
          {searching && results.length === 0 ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No matching members.</div>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((m) => {
                const isPending = pendingMember === m.id;
                const cantCheckIn = m.blocked || !!m.alreadyCheckedInAt;
                return (
                  <li
                    key={m.id}
                    className={cn(
                      "flex items-center justify-between gap-3 p-3 transition-colors",
                      cantCheckIn ? "bg-muted/30" : "hover:bg-muted/30",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{m.fullName}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {m.memberCode}
                        </span>
                        <StatusBadge status={m.status} />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{m.phone}</div>
                      {m.blocked && m.blockReason && (
                        <p className="mt-1 text-xs font-medium text-destructive">
                          {m.blockReason}
                        </p>
                      )}
                      {m.alreadyCheckedInAt && (
                        <p className="mt-1 text-xs font-medium text-accent">
                          ✓ Checked in at {formatTime(m.alreadyCheckedInAt)}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCheckIn(m)}
                      disabled={cantCheckIn || isPending}
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Check in
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
