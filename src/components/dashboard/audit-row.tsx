"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";

type Props = {
  log: {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    oldValue: unknown;
    newValue: unknown;
    metadata: unknown;
    ipAddress: string | null;
    createdAt: Date;
    user: { name: string; email: string; role: string } | null;
  };
};

const ACTION_TONE: Record<string, "default" | "success" | "warn" | "destructive" | "muted"> = {
  CREATE: "success",
  UPDATE: "default",
  DELETE: "destructive",
  SOFT_DELETE: "warn",
  LOGIN: "muted",
  LOGOUT: "muted",
  LOGIN_FAILED: "destructive",
  PAYMENT_VOIDED: "destructive",
  PAYMENT_REFUNDED: "warn",
  DISCOUNT_APPLIED: "warn",
  MEMBERSHIP_FROZEN: "muted",
  MEMBERSHIP_RENEWED: "success",
  ATTENDANCE_EDITED: "warn",
  SETTINGS_UPDATED: "warn",
};

export function AuditRow({ log }: Props) {
  const [open, setOpen] = useState(false);
  const hasDetails = !!(log.oldValue || log.newValue || log.metadata);
  const tone = ACTION_TONE[log.action] ?? "default";

  return (
    <li className="rounded-md border border-border bg-card">
      <button
        type="button"
        onClick={() => hasDetails && setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left",
          hasDetails && "cursor-pointer hover:bg-muted/30",
        )}
      >
        <div className="w-4 shrink-0 text-muted-foreground">
          {hasDetails ? (
            open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={tone}>{log.action}</Badge>
            <span className="text-sm font-medium">{log.entityType}</span>
            {log.entityId && (
              <span className="font-mono text-xs text-muted-foreground">{log.entityId}</span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {log.user?.name ?? "System"}
            {log.user?.email && <span> · {log.user.email}</span>}
            {log.ipAddress && <span> · {log.ipAddress}</span>}
            <span> · {formatDateTime(log.createdAt)}</span>
          </div>
        </div>
      </button>

      {open && hasDetails && (
        <div className="space-y-3 border-t border-border bg-muted/30 px-4 py-3 text-xs">
          {log.oldValue !== null && log.oldValue !== undefined && (
            <Diff label="Old value" value={log.oldValue} />
          )}
          {log.newValue !== null && log.newValue !== undefined && (
            <Diff label="New value" value={log.newValue} />
          )}
          {log.metadata !== null && log.metadata !== undefined && (
            <Diff label="Metadata" value={log.metadata} />
          )}
        </div>
      )}
    </li>
  );
}

function Diff({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <pre className="overflow-x-auto rounded-md border border-border bg-background p-2 font-mono text-[11px] leading-relaxed">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
