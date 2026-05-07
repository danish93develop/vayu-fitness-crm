import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Edit,
  Phone,
  Mail,
  Dumbbell,
  Users,
  CalendarDays,
} from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AvatarCell } from "@/components/tables/avatar-cell";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatDate, formatTime } from "@/lib/date";

export const metadata = { title: "Trainer" };
export const dynamic = "force-dynamic";

export default async function TrainerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("trainers:read");
  const { id } = await params;

  const trainer = await prisma.trainer.findFirst({
    where: { id, gymId: session.user.gymId, deletedAt: null },
    include: {
      assignedMembers: {
        where: { deletedAt: null },
        orderBy: { fullName: "asc" },
      },
      classes: {
        where: { deletedAt: null, date: { gte: new Date() } },
        orderBy: { date: "asc" },
        take: 10,
      },
    },
  });
  if (!trainer) notFound();

  const canEdit = can(session.user.role, "trainers:update");
  const memberCount = trainer.assignedMembers.length;
  const classCount = trainer.classes.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={trainer.name}
        description={
          <span className="flex items-center gap-2">
            {trainer.specialization ? (
              <span>{trainer.specialization}</span>
            ) : (
              <span className="text-muted-foreground">No specialization</span>
            )}
            {trainer.isActive ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="muted">Inactive</Badge>
            )}
          </span>
        }
        actions={
          canEdit && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/trainers/${trainer.id}/edit` as never}>
                <Edit className="h-4 w-4" /> Edit
              </Link>
            </Button>
          )
        }
      />

      {/* Profile + stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field icon={Dumbbell} label="Specialization" value={trainer.specialization} />
            <Field icon={Phone} label="Phone" value={trainer.phone} />
            <Field icon={Mail} label="Email" value={trainer.email} />
            <Field
              icon={CalendarDays}
              label="Joined"
              value={formatDate(trainer.createdAt)}
            />
            {trainer.bio && (
              <div className="sm:col-span-2">
                <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                  Bio
                </div>
                <p className="whitespace-pre-wrap text-sm">{trainer.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>At a glance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Stat label="Assigned members" value={memberCount} />
            <Stat label="Upcoming classes" value={classCount} />
          </CardContent>
        </Card>
      </div>

      {/* Assigned members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assigned members
            </span>
            <Badge variant="muted">{memberCount}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {memberCount === 0 ? (
            <EmptyState icon={Users} message="No members assigned to this trainer." />
          ) : (
            <ul className="divide-y divide-border">
              {trainer.assignedMembers.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <AvatarCell name={m.fullName} seed={m.memberCode} size="sm" />
                    <div className="min-w-0">
                      <Link
                        href={`/members/${m.id}` as never}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {m.fullName}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-mono">{m.memberCode}</span>
                        {" · "}
                        {m.phone}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={m.status} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Upcoming classes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Upcoming classes
            </span>
            <Badge variant="muted">{classCount}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classCount === 0 ? (
            <EmptyState icon={CalendarDays} message="No upcoming classes scheduled." />
          ) : (
            <ul className="divide-y divide-border">
              {trainer.classes.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(c.date)} · {formatTime(c.startTime)}{" – "}
                      {formatTime(c.endTime)} · capacity {c.capacity}
                    </div>
                  </div>
                  <StatusBadge status={c.status} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-sm">
        {value || <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-lg font-bold tabular-nums">{value}</span>
    </div>
  );
}
