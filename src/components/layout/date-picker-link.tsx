"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";

/**
 * URL-driven date picker. Updates ?date=YYYY-MM-DD on change.
 */
export function DatePickerLink({ value, paramName = "date" }: { value: string; paramName?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function handleChange(v: string) {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(paramName, v);
    else next.delete(paramName);
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}` as never, { scroll: false });
    });
  }

  return (
    <Input
      type="date"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className="w-44"
    />
  );
}
