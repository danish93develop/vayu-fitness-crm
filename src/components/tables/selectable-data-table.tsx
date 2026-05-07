"use client";

import { useState, useMemo } from "react";
import { Inbox, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** When true, this column is the headline on the mobile card */
  mobilePrimary?: boolean;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  emptyMessage?: string;
  rowKey: (row: T) => string;
  /**
   * Render-prop for the bulk-action bar. Called when ≥1 row is selected.
   * The component owns the cleared-selection state via `clear`.
   */
  bulkActions?: (ctx: {
    selectedIds: string[];
    selectedRows: T[];
    clear: () => void;
  }) => React.ReactNode;
};

/**
 * DataTable variant with a leading checkbox column. Selection state is held
 * locally; the consumer reads it through the `bulkActions` render-prop. When
 * nothing is selected the bulk bar collapses, so the table looks identical
 * to the non-selectable variant for the common case.
 */
export function SelectableDataTable<T>({
  rows,
  columns,
  emptyMessage = "No results yet.",
  rowKey,
  bulkActions,
}: Props<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allKeys = useMemo(() => rows.map(rowKey), [rows, rowKey]);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedIds.has(k));
  const someSelected = !allSelected && allKeys.some((k) => selectedIds.has(k));

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(rowKey(r))),
    [rows, selectedIds, rowKey],
  );

  function toggleAll() {
    if (allSelected) {
      // Clear only the rows currently visible — leave selections from other
      // pages alone if you ever paginate. (Today rows are per-page anyway.)
      const next = new Set(selectedIds);
      allKeys.forEach((k) => next.delete(k));
      setSelectedIds(next);
    } else {
      setSelectedIds(new Set([...selectedIds, ...allKeys]));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function clear() {
    setSelectedIds(new Set());
  }

  const primary = columns.find((c) => c.mobilePrimary) ?? columns[0];
  const others = columns.filter((c) => c !== primary);
  const selectionCount = selectedIds.size;

  return (
    <div className="space-y-3">
      {/* ─── Bulk action bar ───────────────────────────────────────────── */}
      {bulkActions && selectionCount > 0 && (
        <div className="sticky top-2 z-30 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/[0.06] px-4 py-2.5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={clear}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="text-sm">
              <span className="font-semibold">{selectionCount}</span>
              <span className="text-muted-foreground">
                {" "}
                selected
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {bulkActions({
              selectedIds: Array.from(selectedIds),
              selectedRows,
              clear,
            })}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* ─── Desktop table ───────────────────────────────────────────── */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                    aria-label="Select all"
                    disabled={rows.length === 0}
                  />
                </th>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                      c.className,
                    )}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-16">
                    <EmptyBlock message={emptyMessage} />
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const id = rowKey(row);
                  const isSelected = selectedIds.has(id);
                  return (
                    <tr
                      key={id}
                      className={cn(
                        "group transition-colors",
                        isSelected ? "bg-primary/[0.05]" : "hover:bg-muted/40",
                      )}
                    >
                      <td className="w-10 px-4 py-4 align-middle">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleOne(id)}
                          aria-label="Select row"
                        />
                      </td>
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={cn("px-6 py-4 align-middle", c.className)}
                        >
                          {c.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Mobile cards ────────────────────────────────────────────── */}
        <div className="md:hidden">
          {rows.length === 0 ? (
            <div className="px-4 py-12">
              <EmptyBlock message={emptyMessage} />
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {rows.map((row) => {
                const id = rowKey(row);
                const isSelected = selectedIds.has(id);
                return (
                  <li
                    key={id}
                    className={cn(
                      "flex gap-3 px-4 py-3",
                      isSelected && "bg-primary/[0.05]",
                    )}
                  >
                    <div className="pt-1">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleOne(id)}
                        aria-label="Select row"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      {primary && <div>{primary.cell(row)}</div>}
                      {others.length > 0 && (
                        <dl className="space-y-1 pl-1 text-xs">
                          {others.map((c) => (
                            <div
                              key={c.key}
                              className="flex items-start justify-between gap-3"
                            >
                              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {c.header}
                              </dt>
                              <dd className="min-w-0 flex-1 text-right">{c.cell(row)}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** Tiny native-checkbox wrapper that handles `indeterminate` via ref */
function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  disabled = false,
  ...props
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate;
      }}
      onClick={(e) => e.stopPropagation()}
      className="h-4 w-4 cursor-pointer rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-40"
      {...props}
    />
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-5 w-5 opacity-50" />
      </div>
      <p>{message}</p>
    </div>
  );
}
