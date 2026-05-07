"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  paramName: string;
  value: string;
  options: { value: string; label: string }[];
  className?: string;
  resetParam?: string; // pagination param to clear when filter changes
};

/**
 * URL-driven select dropdown. Updates ?<paramName>=<value> on change.
 * Use anywhere you want a filter that survives page refresh and bookmarks.
 */
export function FilterSelect({
  paramName,
  value,
  options,
  className,
  resetParam = "page",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function handleChange(v: string) {
    const next = new URLSearchParams(params.toString());
    if (v === "ALL") next.delete(paramName);
    else next.set(paramName, v);
    next.delete(resetParam);
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}` as never, { scroll: false });
    });
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className={className ?? "w-44"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
