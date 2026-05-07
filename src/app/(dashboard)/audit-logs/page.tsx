import Link from "next/link";
import { ScrollText } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { listAuditLogs, listAuditEntityTypes } from "@/server/services/audit";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TablePagination } from "@/components/tables/pagination";
import { DatePickerLink } from "@/components/layout/date-picker-link";
import { FilterSelect } from "@/components/dashboard/filter-select";
import { AuditRow } from "@/components/dashboard/audit-row";
import { EmptyState } from "@/components/dashboard/empty-state";
import type { AuditAction } from "@prisma/client";

export const metadata = { title: "Audit logs" };
export const dynamic = "force-dynamic";

const ACTIONS: AuditAction[] = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "SOFT_DELETE",
  "RESTORE",
  "LOGIN",
  "LOGOUT",
  "LOGIN_FAILED",
  "PASSWORD_CHANGED",
  "ROLE_CHANGED",
  "PAYMENT_VOIDED",
  "PAYMENT_REFUNDED",
  "DISCOUNT_APPLIED",
  "MEMBERSHIP_FROZEN",
  "MEMBERSHIP_RENEWED",
  "ATTENDANCE_EDITED",
  "SETTINGS_UPDATED",
];

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    entityType?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const session = await requirePermission("auditLogs:read");
  const sp = await searchParams;

  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const fromDate = sp.from ? new Date(sp.from) : undefined;
  const toDate = sp.to ? new Date(sp.to) : undefined;

  const [{ items, total, pageCount, pageSize }, entityTypes] = await Promise.all([
    listAuditLogs(session.user.gymId, {
      entityType: sp.entityType,
      action: (sp.action as AuditAction | undefined) ?? "ALL",
      fromDate,
      toDate,
      page,
      pageSize: 50,
    }),
    listAuditEntityTypes(session.user.gymId),
  ]);

  const hasFilters = !!(sp.entityType || sp.action || sp.from || sp.to);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit logs"
        description={`${total.toLocaleString("en-IN")} entries. Click any row to expand the old / new value diff.`}
      />

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Entity</div>
            <FilterSelect
              paramName="entityType"
              value={sp.entityType ?? "ALL"}
              options={[
                { value: "ALL", label: "All entities" },
                ...entityTypes.map((e) => ({ value: e, label: e })),
              ]}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Action</div>
            <FilterSelect
              paramName="action"
              value={sp.action ?? "ALL"}
              options={[
                { value: "ALL", label: "All actions" },
                ...ACTIONS.map((a) => ({ value: a, label: a })),
              ]}
              className="w-52"
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">From</div>
            <DatePickerLink value={sp.from ?? ""} paramName="from" />
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">To</div>
            <DatePickerLink value={sp.to ?? ""} paramName="to" />
          </div>
          {hasFilters && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/audit-logs">Clear all</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState icon={ScrollText} message="No audit log entries match the current filters." />
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((log) => (
            <AuditRow key={log.id} log={log} />
          ))}
        </ul>
      )}

      <TablePagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} />
    </div>
  );
}
