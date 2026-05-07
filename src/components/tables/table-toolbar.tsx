"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FilterOption = { value: string; label: string };

type Props = {
  searchPlaceholder?: string;
  filterLabel?: string;
  filterOptions?: FilterOption[];
  newHref?: string;
  newLabel?: string;
};

export function TableToolbar({
  searchPlaceholder = "Search…",
  filterLabel = "Status",
  filterOptions,
  newHref,
  newLabel = "Add new",
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(params.get("q") ?? "");
  const filter = params.get("status") ?? "ALL";

  // Debounce search → URL
  useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (search) next.set("q", search);
      else next.delete("q");
      next.delete("page"); // reset pagination on search
      startTransition(() => {
        router.replace(`?${next.toString()}` as never, { scroll: false });
      });
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function handleFilterChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "ALL") next.delete("status");
    else next.set("status", value);
    next.delete("page");
    startTransition(() => {
      router.replace(`?${next.toString()}` as never, { scroll: false });
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>

        {filterOptions && filterOptions.length > 0 && (
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={filterLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All {filterLabel.toLowerCase()}es</SelectItem>
              {filterOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {newHref && (
        <Button asChild>
          <Link href={newHref as never}>
            <Plus className="h-4 w-4" />
            {newLabel}
          </Link>
        </Button>
      )}
    </div>
  );
}
