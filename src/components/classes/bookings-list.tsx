"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Phone, Trash2, Check, Loader2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AvatarCell } from "@/components/tables/avatar-cell";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatDateTime } from "@/lib/date";
import {
  cancelBookingAction,
  markAttendanceAction,
} from "@/server/actions/class-bookings";
import { cn } from "@/lib/utils";
import type { ClassBookingStatus, MemberStatus } from "@prisma/client";

export type Booking = {
  id: string;
  status: ClassBookingStatus;
  attended: boolean;
  bookedAt: Date;
  cancelledAt: Date | null;
  member: {
    id: string;
    fullName: string;
    memberCode: string;
    phone: string;
    status: MemberStatus;
    profilePhotoUrl: string | null;
  };
  bookedBy: { id: string; name: string } | null;
};

type Props = {
  bookings: Booking[];
  /** Class status — when COMPLETED, expose the attendance toggle */
  classStatus: "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";
};

export function BookingsList({ bookings, classStatus }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState<Booking | null>(null);

  function handleCancel() {
    if (!confirmCancel) return;
    const target = confirmCancel;
    setConfirmCancel(null);
    setPendingId(target.id);
    startTransition(async () => {
      const result = await cancelBookingAction(target.id);
      setPendingId(null);
      if (result.ok) {
        toast.success(`${target.member.fullName} cancelled.`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleAttendance(b: Booking) {
    setPendingId(b.id);
    startTransition(async () => {
      const result = await markAttendanceAction(b.id, !b.attended);
      setPendingId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  const active = bookings.filter((b) => b.status !== "CANCELLED");
  const cancelled = bookings.filter((b) => b.status === "CANCELLED");

  return (
    <>
      <div className="space-y-4">
        {active.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
            No bookings yet. Use the search above to register a member.
          </div>
        ) : (
          <ul className="divide-y divide-border/60 rounded-xl border border-border bg-card">
            {active.map((b) => (
              <li
                key={b.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 transition-colors",
                  b.attended && "bg-emerald-500/[0.04]",
                )}
              >
                <AvatarCell
                  name={b.member.fullName}
                  seed={b.member.id}
                  photoUrl={b.member.profilePhotoUrl}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/members/${b.member.id}` as never}
                      className="text-sm font-medium hover:underline"
                    >
                      {b.member.fullName}
                    </Link>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {b.member.memberCode}
                    </span>
                    <StatusBadge status={b.member.status} />
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {b.member.phone}
                    </span>
                    <span>Booked {formatDateTime(b.bookedAt)}</span>
                    {b.bookedBy && <span>by {b.bookedBy.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(classStatus === "COMPLETED" || classStatus === "ONGOING") && (
                    <Button
                      type="button"
                      size="sm"
                      variant={b.attended ? "default" : "outline"}
                      disabled={pendingId === b.id}
                      onClick={() => handleAttendance(b)}
                    >
                      {pendingId === b.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      {b.attended ? "Attended" : "Mark attended"}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pendingId === b.id}
                    onClick={() => setConfirmCancel(b)}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {cancelled.length > 0 && (
          <details className="rounded-xl border border-border bg-card">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
              Cancelled ({cancelled.length})
            </summary>
            <ul className="divide-y divide-border/60 border-t border-border">
              {cancelled.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground"
                >
                  <AvatarCell
                    name={b.member.fullName}
                    seed={b.member.id}
                    photoUrl={b.member.profilePhotoUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="line-through">{b.member.fullName}</span>
                    <span className="ml-2 font-mono text-[11px]">{b.member.memberCode}</span>
                  </div>
                  <span className="text-xs">
                    {b.cancelledAt && `cancelled ${formatDateTime(b.cancelledAt)}`}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <AlertDialog
        open={!!confirmCancel}
        onOpenChange={(open) => {
          if (!open) setConfirmCancel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cancel {confirmCancel?.member.fullName}&apos;s booking?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The seat opens up for someone else. Cancelled bookings stay in the history
              for audit, and the member can be re-booked anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Cancel booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
