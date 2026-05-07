import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  Clock,
  Users,
  Edit,
  Dumbbell,
  ArrowLeft,
  UserPlus,
} from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getClassBookings } from "@/server/services/class-bookings";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { MemberPicker } from "@/components/classes/member-picker";
import { BookingsList } from "@/components/classes/bookings-list";
import { formatDate, formatTime } from "@/lib/date";
import { cn } from "@/lib/utils";

export const metadata = { title: "Class details" };
export const dynamic = "force-dynamic";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requirePermission("classes:read");
  const data = await getClassBookings(session.user.gymId, id);
  if (!data) return notFound();

  const { cls, bookings, bookedCount, seatsLeft } = data;

  const canEdit = can(session.user.role, "classes:update");
  const canBook = can(session.user.role, "classes:book");
  const fillPct = Math.min(100, Math.round((bookedCount / cls.capacity) * 100));
  const isFull = seatsLeft === 0;
  const isCancelled = cls.status === "CANCELLED";
  const isCompleted = cls.status === "COMPLETED";

  // Plain rows for the client list (avoid leaking Prisma class instances)
  const rows = bookings.map((b) => ({
    id: b.id,
    status: b.status,
    attended: b.attended,
    bookedAt: b.bookedAt,
    cancelledAt: b.cancelledAt,
    member: {
      id: b.member.id,
      fullName: b.member.fullName,
      memberCode: b.member.memberCode,
      phone: b.member.phone,
      status: b.member.status,
      profilePhotoUrl: b.member.profilePhotoUrl,
    },
    bookedBy: b.bookedBy ? { id: b.bookedBy.id, name: b.bookedBy.name } : null,
  }));

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 w-fit">
        <Link href={"/classes" as never}>
          <ArrowLeft className="h-4 w-4" /> All classes
        </Link>
      </Button>

      <PageHeader
        title={cls.name}
        description={
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <StatusBadge status={cls.status} />
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> {formatDate(cls.date)}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(cls.startTime)} – {formatTime(cls.endTime)}
            </span>
            {cls.trainer && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Dumbbell className="h-3.5 w-3.5" /> {cls.trainer.name}
              </span>
            )}
          </div>
        }
        actions={
          canEdit && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/classes/${cls.id}/edit` as never}>
                <Edit className="h-4 w-4" /> Edit class
              </Link>
            </Button>
          )
        }
      />

      {/* ── Capacity card ─────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 text-white shadow-lg shadow-violet-500/30">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-semibold tracking-tight tabular-nums">
                {bookedCount}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}
                  / {cls.capacity}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {isFull
                  ? "Class is full"
                  : `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} remaining`}
              </div>
            </div>
          </div>

          <div className="flex-1 sm:min-w-[200px] sm:max-w-md">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isFull
                    ? "bg-gradient-to-r from-rose-400 to-rose-600"
                    : fillPct > 75
                      ? "bg-gradient-to-r from-amber-400 to-amber-600"
                      : "bg-gradient-to-r from-emerald-400 to-emerald-600",
                )}
                style={{ width: `${fillPct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <span>{fillPct}% full</span>
              {isFull && <span className="text-rose-600 dark:text-rose-400">Waitlist only</span>}
            </div>
          </div>
        </div>

        {cls.notes && (
          <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
            {cls.notes}
          </p>
        )}
      </section>

      {/* ── Member picker (if can book) ───────────────────────────────── */}
      {canBook && !isCancelled && !isCompleted && (
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Register a member</h2>
          </div>
          <MemberPicker
            classId={cls.id}
            disabled={isFull}
            disabledReason={
              isFull ? "Class is full — cancel a booking to free a seat." : undefined
            }
          />
        </section>
      )}

      {(isCancelled || isCompleted) && canBook && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {isCancelled
            ? "This class is cancelled. Bookings are read-only."
            : "This class is completed. Mark attendance below — new bookings are disabled."}
        </div>
      )}

      {/* ── Bookings list ─────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Bookings
        </h2>
        <BookingsList bookings={rows} classStatus={cls.status} />
      </section>
    </div>
  );
}
