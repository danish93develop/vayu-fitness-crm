"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
};

export function TablePagination({ page, pageCount, total, pageSize }: Props) {
  const params = useSearchParams();

  function makeHref(p: number) {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    return `?${next.toString()}`;
  }

  if (pageCount <= 1 && total > 0) {
    return (
      <div className="flex items-center justify-end px-2 py-2 text-xs text-muted-foreground">
        {total} total
      </div>
    );
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-2 py-2">
      <div className="text-xs text-muted-foreground">
        {total === 0 ? "0 results" : `Showing ${start}–${end} of ${total}`}
      </div>
      <div className="flex items-center gap-1">
        <PageLink href={makeHref(Math.max(1, page - 1))} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </PageLink>
        <span className="px-2 text-xs text-muted-foreground">
          Page {page} of {Math.max(1, pageCount)}
        </span>
        <PageLink href={makeHref(Math.min(pageCount, page + 1))} disabled={page >= pageCount}>
          <ChevronRight className="h-4 w-4" />
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md border border-border text-muted-foreground opacity-40">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href as never}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background transition-colors hover:bg-muted",
      )}
      scroll={false}
    >
      {children}
    </Link>
  );
}
