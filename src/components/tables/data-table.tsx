import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** When true on a column, that cell is used as the headline on mobile cards (usually the first column) */
  mobilePrimary?: boolean;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  emptyMessage?: string;
  rowKey: (row: T) => string;
};

/**
 * Responsive data table:
 *   • Desktop (≥ md): polished bordered table with rounded frame
 *   • Mobile (< md):  each row collapses into a card with the primary
 *                     column as the headline and other columns as labeled rows
 */
export function DataTable<T>({
  rows,
  columns,
  emptyMessage = "No results yet.",
  rowKey,
}: Props<T>) {
  const primary = columns.find((c) => c.mobilePrimary) ?? columns[0];
  const others = columns.filter((c) => c !== primary);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* ─── Desktop table ─────────────────────────────────────────────── */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
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
                <td colSpan={columns.length} className="px-6 py-16">
                  <EmptyBlock message={emptyMessage} />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className="group transition-colors hover:bg-muted/40">
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-6 py-4 align-middle", c.className)}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Mobile cards ──────────────────────────────────────────────── */}
      <div className="md:hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-12">
            <EmptyBlock message={emptyMessage} />
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((row) => (
              <li key={rowKey(row)} className="space-y-2 px-4 py-3">
                {primary && <div>{primary.cell(row)}</div>}
                {others.length > 0 && (
                  <dl className="space-y-1 pl-1 text-xs">
                    {others.map((c) => (
                      <div key={c.key} className="flex items-start justify-between gap-3">
                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {c.header}
                        </dt>
                        <dd className="min-w-0 flex-1 text-right">{c.cell(row)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
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
