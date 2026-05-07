import Link from "next/link";
import { CalendarCheck, Users } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { listAttendanceForDate } from "@/server/services/attendance";
import { syncMembershipStatuses } from "@/server/services/membership-status";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CheckInSearch } from "@/components/forms/check-in-search";
import { AttendanceEditButton } from "@/components/forms/attendance-edit-button";
import { AttendanceDeleteButton } from "@/components/forms/attendance-delete-button";
import { CheckOutButton } from "@/components/forms/check-out-button";
import { DatePickerLink } from "@/components/layout/date-picker-link";
import { formatDate, formatTime } from "@/lib/date";

export const metadata = { title: "Attendance" };
export const dynamic = "force-dynamic";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requirePermission("attendance:read");
  await syncMembershipStatuses();

  const sp = await searchParams;
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const viewing = sp.date ? new Date(sp.date) : today;
  const viewingStr = sp.date ?? todayStr;
  const isToday = viewingStr === todayStr;

  const records = await listAttendanceForDate(session.user.gymId, viewing);

  const canMark = can(session.user.role, "attendance:mark");
  const canEdit = can(session.user.role, "attendance:edit");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="One check-in per member per day. Search to mark attendance, or pick a past date to view history."
        actions={<DatePickerLink value={viewingStr} />}
      />

      {/* Quick check-in (only for today) */}
      {isToday && canMark && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" /> Quick check-in
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CheckInSearch />
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {isToday ? "Today's attendance" : `Attendance · ${formatDate(viewing)}`}
            </span>
            <Badge variant="muted">{records.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              message={isToday ? "No one has checked in yet." : "No attendance recorded for this date."}
            />
          ) : (
            <ul className="divide-y divide-border">
              {records.map((a) => {
                const time = a.firstInAt
                  ? `${String(a.firstInAt.getHours()).padStart(2, "0")}:${String(a.firstInAt.getMinutes()).padStart(2, "0")}`
                  : "00:00";
                return (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 text-sm tabular-nums text-foreground">
                        <div className="font-semibold">
                          {a.firstInAt ? formatTime(a.firstInAt) : "—"}
                        </div>
                        {a.lastOutAt && (
                          <div className="text-xs text-muted-foreground">
                            out {formatTime(a.lastOutAt)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/members/${a.member.id}` as never}
                          className="font-medium hover:underline"
                        >
                          {a.member.fullName}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{a.member.memberCode}</span>
                          <StatusBadge status={a.member.status} />
                          {a.markedBy?.name && <span>· by {a.markedBy.name}</span>}
                        </div>
                        {a.notes && (
                          <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>
                        )}
                      </div>
                    </div>
                    {canMark && isToday && !a.lastOutAt && (
                      <CheckOutButton attendanceId={a.id} />
                    )}
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <AttendanceEditButton
                          attendanceId={a.id}
                          memberName={a.member.fullName}
                          currentTime={time}
                          currentNotes={a.notes}
                        />
                        <AttendanceDeleteButton
                          attendanceId={a.id}
                          memberName={a.member.fullName}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
